from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.services.crm_service import crm_service, Lead, Interaction

router = APIRouter(prefix="/crm", tags=["CRM"])


# --------- Schemas (entrada) ---------

class LeadCreate(BaseModel):
    nome: str = Field(..., examples=["Tiago Campos"])
    canal: str = Field("whatsapp", examples=["whatsapp"])
    telefone: Optional[str] = Field(None, examples=["+55 11 99999-9999"])
    tags: List[str] = Field(default_factory=list, examples=[["barbearia", "recorrente"]])


class InteractionCreate(BaseModel):
    tipo: str = Field(..., examples=["mensagem_enviada"])
    note: str = Field("", examples=["Enviei lembrete de retorno"])


# --------- Schemas (saída) ---------

class LeadOut(BaseModel):
    id: str
    nome: str
    canal: str
    telefone: Optional[str]
    tags: List[str]
    created_at: str
    last_contact_at: Optional[str]


class InteractionOut(BaseModel):
    id: str
    lead_id: str
    tipo: str
    note: str
    at: str


def lead_to_out(lead: Lead) -> LeadOut:
    return LeadOut(
        id=lead.id,
        nome=lead.nome,
        canal=lead.canal,
        telefone=lead.telefone,
        tags=lead.tags,
        created_at=lead.created_at.isoformat(),
        last_contact_at=lead.last_contact_at.isoformat() if lead.last_contact_at else None,
    )


def interaction_to_out(inter: Interaction) -> InteractionOut:
    return InteractionOut(
        id=inter.id,
        lead_id=inter.lead_id,
        tipo=inter.tipo,
        note=inter.note,
        at=inter.at.isoformat(),
    )


# --------- Rotas ---------

@router.post("/leads", summary="Criar lead", response_model=Dict[str, Any])
def criar_lead(payload: LeadCreate):
    lead = crm_service.create_lead(
        nome=payload.nome,
        canal=payload.canal,
        telefone=payload.telefone,
        tags=payload.tags,
    )
    return {"ok": True, "lead": lead_to_out(lead)}


@router.get("/leads", summary="Listar leads", response_model=Dict[str, Any])
def listar_leads():
    items = [lead_to_out(l) for l in crm_service.list_leads()]
    return {"ok": True, "items": items}


@router.post("/leads/{lead_id}/interacoes", summary="Registrar interação no lead", response_model=Dict[str, Any])
def registrar_interacao(lead_id: str, payload: InteractionCreate):
    try:
        inter = crm_service.add_interaction(lead_id=lead_id, tipo=payload.tipo, note=payload.note)
        return {"ok": True, "interaction": interaction_to_out(inter)}
    except KeyError:
        raise HTTPException(status_code=404, detail="Lead não encontrado")


@router.get("/cold-leads", summary="Listar leads frios (sem contato há X dias)", response_model=Dict[str, Any])
def leads_frios(days: int = Query(30, ge=1, description="Dias sem contato")):
    items = [lead_to_out(l) for l in crm_service.cold_leads(days_without_contact=days)]
    return {"ok": True, "days": days, "items": items}


@router.get("/leads/{lead_id}/reminder", summary="Gerar sugestão de lembrete para um lead", response_model=Dict[str, Any])
def sugestao_lembrete(lead_id: str):
    try:
        lead = crm_service.get_lead(lead_id)
        msg = crm_service.reminder_suggestion(lead)
        return {"ok": True, "lead_id": lead_id, "mensagem": msg}
    except KeyError:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
