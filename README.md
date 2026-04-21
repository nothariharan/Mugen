# Mugen: The Explainable AI Auditor (XAI-Auditor)

Hackathon build specification for a web platform that detects, fixes, and proves AI fairness for non-technical compliance teams. **Mugen** replaces generic AI dashboards with a polished, editorial-grade interface designed for clarity and authority.

## The "Impeccable" Design System
Mugen features a custom-built UI/UX system designed for compliance officers:
- **Editorial Typography**: Pairing **Bricolage Grotesque** (Display) and **Schibsted Grotesk** (Data) for a serious, authoritative feel.
- **Precision Color**: A sophisticated **OKLCH** palette (Paper/Ink theme) that uses semantic colors strictly for bias thresholds.
- **Narrative Pacing**: Staggered entrance animations and fluid reveals to help users digest complex auditing stories without overload.

## Tech Stack
- **Frontend**: React 18 (Vite), Tailwind CSS v4, Plotly.js, Zustand.
- **Backend**: Python 3.11 (FastAPI), AIF360, Fairlearn, SHAP, DiCE, google-generativeai.
- **LLM**: Google Gemini 1.5 Pro (or AWS Bedrock) for plain-English compliance reporting.

## Features
- **Detect (Phase 1)**: Intersectional bias detection, proxy leakage scanning, and SHAP-based feature attribution.
- **Fix (Phase 2)**: 
  - **Quick Fix**: Fairlearn post-processing (threshold optimization).
  - **Deep Fix**: AIF360 pre-processing (re-weighting and retraining).
- **Prove (Phase 3)**: Automated PDF compliance reports mapped to EU AI Act articles with Gemini-driven executive summaries.

## Local Development

### Backend
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` or `venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. Set `GEMINI_API_KEY` in `backend/.env`
6. `uvicorn app.main:app --reload --port 8080`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Access at `http://localhost:5173`

## Deployment
- **Backend**: Containerized and ready for Google Cloud Run or Hugging Face Spaces.
- **Frontend**: Optimized for Vercel or Firebase Hosting.
