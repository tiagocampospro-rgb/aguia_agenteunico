# backend/app/services/leads_service.py
from __future__ import annotations

from typing import List, Optional

from app.db.inmemory import Lead, criar_lead, listar_leads, obter_lead


def criar(nome: str, telefone: Optional[str], email: Optional[str], origem: str) -> Lead:
    if not nome.strip():
        raise ValueError("Nome é obrigatório.")
    if not origem.strip():
        raise ValueError("Origem é obrigatória.")
    return criar_lead(nome=nome.strip(), telefone=telefone, email=email, origem=origem.strip())


def listar() -> List[Lead]:
    return listar_leads()


def pegar_por_id(lead_id: str) -> Optional[Lead]:
    return obter_lead(lead_id)
