from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import upload, audit, fix, report, datasets

app = FastAPI(title="Mugen API")

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
app.include_router(datasets.router, prefix="/api", tags=["datasets"])
from .routers import download, drift
app.include_router(download.router, prefix="/api", tags=["download"])
app.include_router(drift.router, prefix="/api", tags=["drift"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Mugen API"}
