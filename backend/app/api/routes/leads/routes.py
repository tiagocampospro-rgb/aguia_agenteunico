# backend/app/api/routes/leads/routes.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import leads_service

router = APIRouter(prefix="/leads", tags=["Leads"])


class LeadCreate(BaseModel):
    nome: str = Field(..., examples=["João da Barbearia"])
    telefone: Optional[str] = Field(None, examples=["+55 11 99999-9999"])
    email: Optional[str] = Field(None, examples=["joao@barbearia.com"])
    origem: str = Field(..., examples=["Instagram"])


class LeadOut(BaseModel):
    id: str
    nome: str
    telefone: Optional[str]
    email: Optional[str]
    origem: str
    status: str
    created_at: datetime


@router.post("", summary="Criar lead", response_model=LeadOut)
def criar_lead(payload: LeadCreate):
    try:
        lead = leads_service.criar(
            nome=payload.nome,
            telefone=payload.telefone,
            email=payload.email,
            origem=payload.origem,
        )
        return LeadOut(**lead.__dict__)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", summary="Listar leads", response_model=List[LeadOut])
def listar_leads():
    leads = leads_service.listar()
    return [LeadOut(**l.__dict__) for l in leads]


@router.get("/{lead_id}", summary="Obter lead por id", response_model=LeadOut)
def obter_lead(lead_id: str):
    lead = leads_service.pegar_por_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return LeadOut(**lead.__dict__)
