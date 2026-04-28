# Deployment Guide: Vercel (Frontend) + Google Cloud Run (Backend)

This guide walks you through deploying the Mugen BiasAudit project using **Vercel** for the React/Vite frontend and **Google Cloud Run** for the Python/FastAPI backend.

---

## 1. Deploy the Backend (FastAPI) to Google Cloud Run

Google Cloud Run is a scalable containerized environment. We have already prepared the `Dockerfile` to bind correctly to the `$PORT` environment variable that Cloud Run requires.

### Prerequisites:
1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
2. Authenticate and configure your project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_GOOGLE_CLOUD_PROJECT_ID
   ```
3. Enable Cloud Run and Cloud Build APIs in your GCP project.

### Deployment Steps:
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Deploy directly from source using Cloud Run:
   ```bash
   gcloud run deploy mugen-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 1024Mi \
     --max-instances 1 \
     --session-affinity
   ```
   > **Important Note:** We set `--max-instances 1` and enable `--session-affinity` because the MVP currently stores uploaded files (`TEMP_DIR`) and session state (`UPLOADS`) in memory. In a production environment, you should use Google Cloud Storage (GCS) and a database (like Redis/PostgreSQL).

3. When the deployment finishes, Google Cloud Run will provide a **Service URL** (e.g., `https://mugen-backend-abcde-uc.a.run.app`). Keep this URL handy.

### Set Environment Variables in Google Cloud:
If your backend requires API keys (e.g., for Gemini or AWS), set them via the Cloud Run console or CLI:
```bash
gcloud run services update mugen-backend \
  --update-env-vars GEMINI_API_KEY="your-key-here",AWS_ACCESS_KEY_ID="your-id",AWS_SECRET_ACCESS_KEY="your-secret",AWS_REGION="us-east-1"
```

---

## 2. Deploy the Frontend (React/Vite) to Vercel

Vercel provides native, seamless support for Vite React apps and is extremely fast.

1. Create an account at [Vercel.com](https://vercel.com) and link your GitHub.
2. Push all your code to GitHub if you haven't already.
3. In Vercel, click **Add New... -> Project**.
4. Import your `BiasAudit` repository.
5. Configure the project:
   * **Project Name:** `mugen-auditor` (or similar)
   * **Framework Preset:** Vite (Vercel should detect this automatically)
   * **Root Directory:** `frontend` *(Important! Click edit and select the `frontend` folder)*
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
6. **Set Environment Variables:**
   Expand the "Environment Variables" section and add:
   * **Name:** `VITE_API_BASE_URL`
   * **Value:** Your Google Cloud Run URL appended with `/api` 
     *(Example: `https://mugen-backend-abcde-uc.a.run.app/api`)*
7. Click **Deploy**.
8. Wait ~1-2 minutes. Vercel will give you a live URL like `https://mugen-auditor.vercel.app`.

---

## 🎉 You're Live!

* **Frontend URL:** Your Vercel link. Share this with users.
* **Backend URL:** Your Google Cloud Run link.

### Common Issues & Troubleshooting

* **File Uploads Lost / Not Found (404s):**
  If uploads succeed but subsequent API calls fail with "Upload ID not found", your Cloud Run instance might have scaled up to 2 instances or restarted. Ensure you deployed with `--max-instances 1` and `--session-affinity` as shown above.
  
* **CORS Errors:**
  If the frontend console shows CORS errors, verify that `VITE_API_BASE_URL` is set correctly in Vercel (no trailing slash). The backend currently uses `allow_origins=["*"]`, so it should accept requests from any domain, including Vercel.

* **Heavy ML Processing:**
  If AIF360/SHAP calculations crash due to out-of-memory errors, you may need to increase the memory limit of your Cloud Run service (e.g., `--memory 2048Mi` or `4096Mi`).
