from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import upload, audit, fix, report

app = FastAPI(title="Explainable AI Auditor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(audit.router, prefix="/api", tags=["audit"])
app.include_router(fix.router, prefix="/api", tags=["fix"])
app.include_router(report.router, prefix="/api", tags=["report"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Explainable AI Auditor API"}
