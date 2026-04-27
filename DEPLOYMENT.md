# Easiest Free-Tier Deployment Guide (Vercel + Render)

For a hackathon MVP, the absolute easiest and most reliable free-tier deployment stack (outside of Google Cloud) is:

1.  **Frontend:** [Vercel](https://vercel.com) (Instant, free, built for React/Vite).
2.  **Backend:** [Render](https://render.com) (Free tier for Python/FastAPI web services).

Here is the step-by-step guide to get Mugen live in under 15 minutes.

---

## 1. Deploy the Backend (FastAPI) to Render

Render will automatically build and host your Python backend. The free tier spins down after 15 minutes of inactivity (which means the *first* request after a break might take 30 seconds to wake up), but it is perfectly fine for a hackathon.

1.  Push all your code to GitHub.
2.  Create an account at [Render.com](https://render.com) and link your GitHub.
3.  Click **New +** and select **Web Service**.
4.  Select your `BiasAudit` repository.
5.  Configure the service:
    *   **Name:** `mugen-api` (or similar)
    *   **Language:** Python
    *   **Branch:** `main`
    *   **Root Directory:** `backend` (Important! Tell Render where the Python code lives)
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
    *   **Instance Type:** Free
6.  Click **Create Web Service**.
7.  Wait ~3-5 minutes for the build to finish. Render will give you a URL like `https://mugen-api.onrender.com`. Keep this URL handy.

---

## 2. Connect Frontend to Backend

Before deploying the frontend, you need to tell it where the live backend lives.

1.  In your `frontend` folder, create or edit the `.env.production` file (or just `.env`).
2.  Add your Render API URL:
    ```env
    VITE_API_URL=https://mugen-api.onrender.com
    ```
    *(Note: Ensure your `apiClient.ts` uses `import.meta.env.VITE_API_URL` to set the base URL for requests).*
3.  Commit and push this change to GitHub.

---

## 3. Deploy the Frontend (React/Vite) to Vercel

Vercel is the creator of Next.js and has best-in-class support for Vite React apps. It is completely free for personal/hobby projects.

1.  Create an account at [Vercel.com](https://vercel.com) and link your GitHub.
2.  Click **Add New... -> Project**.
3.  Import your `BiasAudit` repository.
4.  Configure the project:
    *   **Project Name:** `mugen-auditor` (or similar)
    *   **Framework Preset:** Vite (Vercel should detect this automatically)
    *   **Root Directory:** `frontend` (Important! Tell Vercel where the React code lives)
    *   **Environment Variables:** Add `VITE_API_URL` and set its value to your Render URL (`https://mugen-api.onrender.com`).
5.  Click **Deploy**.
6.  Wait ~1-2 minutes. Vercel will give you a live URL like `https://mugen-auditor.vercel.app`.

---

## 🎉 You're Live!

*   **Frontend URL:** Your Vercel link. Share this with judges.
*   **Backend URL:** Your Render link.

### Common Issues & Troubleshooting

*   **CORS Errors:** If the frontend can't talk to the backend, ensure your FastAPI CORS middleware allows requests from your Vercel URL.
    *   In `backend/app/main.py`:
        ```python
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["https://mugen-auditor.vercel.app", "http://localhost:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        ```
*   **Render "Spin Up" Time:** Remember, Render free tier goes to sleep. If you demonstrate this live, hit the API once 2 minutes before your presentation to "wake it up" so it's fast when the judges see it.
*   **Heavy ML Processing:** Render's free tier has 512MB of RAM. If your AIF360/SHAP calculations try to load massive datasets, it might run out of memory. Keep your demo dataset (like German Credit) small for the live pitch.
