from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.leads import router as leads_router
from app.api.routes.crm import router as crm_router
from app.api.routes.decision import router as decision_router

app = FastAPI(
    title="AG.U.IA",
    description="Agente Único de IA para CRM, prospecção e nutrição de leads",
    version="0.1.0",
)

# ✅ CORS (permite o navegador chamar a API a partir do frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(leads_router)
app.include_router(crm_router)
app.include_router(decision_router)
