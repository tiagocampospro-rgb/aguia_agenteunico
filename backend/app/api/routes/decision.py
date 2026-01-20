from fastapi import APIRouter, HTTPException

from app.services.crm_service import crm_service
from app.services.decision_service import decision_service

router = APIRouter(prefix="/decision", tags=["Agente (Heurística)"])


@router.get("/leads/{lead_id}", summary="Gerar decisão (score + próxima ação) para um lead")
def decision_for_lead(lead_id: str):
    try:
        lead = crm_service.get_lead(lead_id)
        d = decision_service.score_lead(lead)
        return {"ok": True, "decision": d}
    except KeyError:
        raise HTTPException(status_code=404, detail="Lead não encontrado")


@router.get("/ranking", summary="Ranking de prioridade dos leads (top primeiro)")
def decision_ranking():
    leads = crm_service.list_leads()
    decisions = [decision_service.score_lead(l) for l in leads]
    decisions.sort(key=lambda x: x.score, reverse=True)
    return {"ok": True, "items": decisions}
