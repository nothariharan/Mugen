# Mugen AI Auditor: Setup & Running Guide

This document provides step-by-step instructions for running the Mugen AI Auditor locally.

---

## 🛠️ Prerequisites
- **Node.js**: (Version 18 or higher)
- **Python**: **3.9.x** (Required for ML library compatibility)
- **Git**

---

## 🐍 Backend Setup (Python 3.9)

### 1. Environment Setup
The backend requires Python 3.9 due to specific dependencies like `modelscan` and older `tensorflow` versions.

```powershell
cd backend
# Create a virtual environment specifically for Python 3.9
# Note: Ensure you have Python 3.9 installed on your system
py -3.9 -m venv venv_39
.\venv_39\Scripts\activate
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```
> [!IMPORTANT]
> If you encounter a `RuntimeError: Form data requires "python-multipart"` error, run:
> `pip uninstall multipart`
> `pip install python-multipart`

### 3. Environment Variables
Create a file named `.env` in the `backend/` directory with the following content:

```env
GEMINI_API_KEY="your_google_gemini_key"
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_DEFAULT_REGION="us-east-1"
```
*The system will prioritize AWS Bedrock (Claude 3 Haiku) if AWS keys are provided. Otherwise, it falls back to Gemini.*

### 4. Run the Backend
```powershell
uvicorn app.main:app --reload --port 8080
```
- API Documentation: `http://localhost:8080/docs`

---

## 💻 Frontend Setup (React + Vite)

### 1. Install Dependencies
```powershell
cd frontend
npm install
```

### 2. Run the Frontend
```powershell
npm run dev
```
- Access at: `http://localhost:5173`

---

## 🚀 Basic Workflow (Demo)
1. **Start both Backend and Frontend.**
2. Open the browser to `localhost:5173`.
3. Click the **"Load German Credit Demo Dataset"** button on the home page.
4. **Phase 1 (Audit)**: The dashboard will show bias scores, fairness metrics, and feature importance.
5. **Phase 2 (Mitigate)**: Click "Mitigate Bias" to run the re-weighting algorithms.
6. **Phase 3 (Report)**: Click "Download Compliance Report" to generate a PDF report using the configured LLM (AWS/Gemini).

---

## 🔍 Troubleshooting

### Numpy Version Conflict
If you see `ModuleNotFoundError: No module named 'numpy._core'`, ensure you are using the pinned versions in `requirements.txt`:
- `numpy<=1.24.3`
- `pandas<2.2.0`
- `scipy<1.13.0`

### Infinite Loading
If the Phase 1 pipeline keeps spinning for more than 5 minutes, check the Backend terminal for errors. The frontend is patched to alert you of errors, but a server crash might stop polling.
