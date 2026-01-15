from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.leads import router as leads_router
from app.api.routes.crm import router as crm_router


app = FastAPI(
    title="AG.U.IA",
    description="Agente Único de IA para CRM, prospecção e nutrição de leads",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(leads_router)
app.include_router(crm_router)
