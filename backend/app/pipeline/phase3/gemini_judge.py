from google import genai
from google.genai import types
import os
import json
import boto3
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

# Fetch configs
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

# Initialise the new Gemini client (only if key is available)
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

async def get_gemini_verdict(domain: str, rules_verdict_json: dict, metrics_json: dict,
                             shap_top5: dict, dice_example: dict,
                             before_score: float, after_score: float) -> dict:
    """
    Using Gemini (google-genai SDK) or AWS Bedrock for plain-English explanation
    of compliance and bias metrics.
    """
    if not GEMINI_API_KEY and not AWS_ACCESS_KEY_ID:
        return {"summary": "No LLM API keys found (Gemini or AWS). Manual verification required."}

    system_prompt = (
        "You are a compliance report writer for an AI governance platform. "
        "You receive JSON metrics and a rules engine verdict. You must: "
        "1. Write a plain-English executive summary (2 paragraphs, no jargon). "
        "2. Write one sentence per EU AI Act article explaining how the metric satisfies it. "
        "3. Never claim the model is 'legal' or 'illegal' — use 'meets threshold' / 'fails threshold'. "
        "4. Output JSON: { \"summary\": \"...\", \"article_10\": \"...\", \"article_12\": \"...\", \"article_14\": \"...\", \"recourse_explanation\": \"...\" }\n"
        "Output ONLY valid JSON."
    )

    user_prompt = f"""
    Domain: {domain}
    Rules verdict: {json.dumps(rules_verdict_json)}
    Bias metrics: {json.dumps(metrics_json)}
    Top SHAP features: {json.dumps(shap_top5)}
    DiCE recourse example: {json.dumps(dice_example)}
    Before score: {before_score} | After score: {after_score}
    """

    try:
        raw_text = ""

        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
            # Route to AWS Bedrock (Claude 3 Haiku)
            bedrock_client = boto3.client(
                "bedrock-runtime",
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION
            )

            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            })

            import asyncio
            response = await asyncio.to_thread(
                bedrock_client.invoke_model,
                modelId="anthropic.claude-3-haiku-20240307-v1:0",
                body=body
            )

            response_body = json.loads(response.get('body').read())
            raw_text = response_body.get('content')[0]['text']

        elif gemini_client:
            # Route to Gemini using the new google-genai SDK
            import asyncio
            response = await asyncio.to_thread(
                gemini_client.models.generate_content,
                model="gemini-2.0-flash",
                contents=f"{system_prompt}\n\nUSER:\n{user_prompt}",
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=1000,
                )
            )
            raw_text = response.text

        # Extract JSON from response text (models might add markdown code fences)
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}') + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No JSON object found in response.")

        json_str = raw_text[start_idx:end_idx]
        return json.loads(json_str)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "summary": "Error parsing LLM response.",
            "raw": str(e)
        }
