# Explainable AI Auditor (XAI-Auditor)

Hackathon build specification for a web platform that detects, fixes, and proves AI fairness for non-technical compliance teams.

## Tech Stack
- **Frontend**: React 18 (Vite), Tailwind CSS, Plotly.js, Zustand, TanStack Query.
- **Backend**: Python 3.11 (FastAPI), AIF360, Fairlearn, SHAP, DiCE, Deepchecks, ReportLab.
- **LLM**: Google Gemini 1.5 Pro for plain-English compliance reporting.
- **Deployment**: Google Cloud Run (Containerized).

## Features
- **Detect (Phase 1)**: Bias detection using 10+ metrics, security scans, data profiling, and SHAP-based feature attribution.
- **Fix (Phase 2)**: Two pathways for mitigation — "Quick Fix" (Fairlearn post-processing) and "Deep Fix" (AIF360 re-weighting + retraining).
- **Prove (Phase 3)**: Automatic PDF generation with Gemini-driven summaries mapped to EU AI Act articles.

## Local Development

### Backend
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. `export GEMINI_API_KEY=your_key_here`
6. `uvicorn app.main:app --reload --port 8080`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Access at `http://localhost:5173`

## Deployment
Build and deploy the backend container to Google Cloud Run:
```bash
gcloud run deploy xai-auditor-backend --source backend/ --set-env-vars GEMINI_API_KEY=...
```

The frontend can be deployed to Vercel or Firebase Hosting.
