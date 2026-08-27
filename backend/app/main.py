"""
Agentic Commerce — FastAPI backend entry point.
Replace the placeholder routes below with your actual application logic.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Agentic Commerce API",
    description="Razorpay AI Buildathon — Agentic Commerce Backend",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────
import os

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check (required by CI and load balancers) ──────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "agentic-commerce-backend"}


# ── Placeholder routers (add your actual routers here) ───────────────────
# from app.routers import payments, products, agents
# app.include_router(payments.router, prefix="/api/payments")
# app.include_router(products.router, prefix="/api/products")
# app.include_router(agents.router,   prefix="/api/agents")
