import google.generativeai as genai
import os
import json

# Fetching GEMINI_API_KEY from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-pro")

async def get_gemini_verdict(domain: str, rules_verdict_json: dict, metrics_json: dict, 
                             shap_top5: dict, dice_example: dict, 
                             before_score: float, after_score: float) -> dict:
    """
    Using Gemini for plain-English explanation of compliance and bias metrics.
    """
    if not GEMINI_API_KEY:
        return {"summary": "Gemini API key not found. Manual verification required."}
        
    system_prompt = (
        "You are a compliance report writer for an AI governance platform. "
        "You receive JSON metrics and a rules engine verdict. You must: "
        "1. Write a plain-English executive summary (2 paragraphs, no jargon). "
        "2. Write one sentence per EU AI Act article explaining how the metric satisfies it. "
        "3. Never claim the model is 'legal' or 'illegal' — use 'meets threshold' / 'fails threshold'. "
        "4. Output JSON: { \"summary\": \"...\", \"article_10\": \"...\", \"article_12\": \"...\", \"article_14\": \"...\", \"recourse_explanation\": \"...\" }"
    )
    
    user_prompt = f"""
    Domain: {domain}
    Rules verdict: {json.dumps(rules_verdict_json)}
    Bias metrics: {json.dumps(metrics_json)}
    Top SHAP features: {json.dumps(shap_top5)}
    DiCE recourse example: {json.dumps(dice_example)}
    Before score: {before_score} | After score: {after_score}
    """
    
    # Generate content using Gemini
    response = await model.generate_content_async(
        f"{system_prompt}\n\nUSER:\n{user_prompt}"
    )
    
    # Extract JSON from response text (Gemini might add markdown)
    try:
        raw_text = response.text
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}') + 1
        json_str = raw_text[start_idx:end_idx]
        return json.loads(json_str)
    except Exception as e:
        return {
            "summary": "Error parsing Gemini response.",
            "raw": response.text if hasattr(response, 'text') else str(e)
        }
