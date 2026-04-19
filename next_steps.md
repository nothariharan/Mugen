# Mugen — What to Do Next

This document provides a comprehensive guide for testing the current version of **Mugen** and outlines the technical roadmap for future implementation phases.

---

## 🧪 Phase 1: Testing the Current Version

To ensure the "Detect → Fix → Prove" cycle is working correctly across the Python 3.9 environment, follow these steps:

### 1. Environment Setup
Ensure your servers are running:
*   **Backend**: In a terminal with `venv_39` active:
    ```powershell
    $env:GEMINI_API_KEY = "your-key"
    uvicorn app.main:app --reload --port 8080
    ```
*   **Frontend**: In a separate terminal:
    ```powershell
    npm run dev
    ```

### 2. Functional Test: The Demo Flow
The easiest way to verify all integrated pipelines:
1.  Navigate to `http://localhost:5173`.
2.  Click **"Load German Credit Demo Dataset"**.
3.  **Audit Step**: Verify that the Bias Score Gauge, Aequitas Grid, and Model Explorer all render real data (not mocks).
4.  **Mitigation Step**: Click "Mitigate Bias", select **Quick Fix**, and watch the progress bars. Verify the "After Score" is lower than the "Before Score".
5.  **Reporting Step**: Click "Generate .PDF Report". Download the file and verify it contains the Gemini-generated executive summary and SHAP charts.

### 3. API Verification (Manual)
You can test the endpoints directly via the FastAPI Swagger UI at `http://localhost:8080/docs`:
*   **GET `/api/datasets`**: Should list German Credit, Adult Income, etc.
*   **POST `/api/upload`**: Test by uploading a local CSV and a `.pkl` model.
*   **POST `/api/counterfactual`**: Send an `audit_id` and a `data_point_index` to receive recourse options.

---

## 🚀 Phase 2: Implementation Roadmap

Here are the features required to move Mugen from a "Hackathon Demo" to a "Production-Ready Auditor."

### 1. Cloud Deployment (P0)
**Goal**: Host Mugen on Google Cloud Run for public access.

*   **Implementation Steps**:
    1.  **Docker Completion**: Update `backend/Dockerfile` to use a multi-stage build to keep the image small.
    2.  **Secret Management**: Use Google Secret Manager for the `GEMINI_API_KEY` instead of local env variables.
    3.  **Vite Build**: Generate a production build (`npm run build`) and serve it through Nginx or the FastAPI `StaticFiles` mount.
    4.  **Deployment Command**:
        ```bash
        gcloud run deploy mugen-api --source . --env-vars-file .env.yaml
        ```

### 2. Async Background Tasks (P1)
**Goal**: Prevent HTTP timeouts (504 Errors) when running audits on large datasets (>10,000 rows).

*   **Implementation Steps**:
    1.  **Infrastructure**: Add a Redis container.
    2.  **Worker**: Use **Celery** or **ARQ** to handle `run_full_audit` in the background.
    3.  **Frontend Polling**: Current frontend already supports polling; simply update the `AuditResult` to return `processing` until the background task completes.

### 3. Multi-Metric & Multi-Attribute Audits (P1)
**Goal**: Allow users to audit multiple biases (e.g., Gender vs. Age) simultaneously.

*   **Implementation Steps**:
    1.  **Backend Slicer**: Update `slicer.py` to accept a list of `protected_attributes`.
    2.  **Dashboard Update**: Use a Tabbed view in the `Audit.tsx` page to switch between different attribute grids.

### 4. Enterprise Authentication (P2)
**Goal**: Allow compliance teams to save and share audit reports securely.

*   **Implementation Steps**:
    1.  **Auth Layer**: Integrate **Supabase Auth** or **FastAPI-Users**.
    2.  **Database**: Transition our in-memory `state.py` dictionaries to a persistent PostgreSQL database.
    3.  **Audit History**: A new `/history` page on the frontend to view past PDF reports and bias trends over time.

---

## 🛑 Critical Constraints & Tips

> [!IMPORTANT]
> **Production Memory**: ML libraries (TensorFlow/SHAP) consume significant RAM. Ensure your Cloud Run instance is configured for **at least 4GB RAM**.

> [!WARNING]
> **Gemini Rate Limits**: The AI Report generation is fast but prone to rate limits during high-traffic demos. Always cache the `summary_json` in the audit state so it isn't regenerated every time the user clicks "View Report".
