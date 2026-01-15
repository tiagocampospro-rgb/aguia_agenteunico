# backend/app/db/inmemory.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4


@dataclass
class Lead:
    id: str
    nome: str
    telefone: Optional[str]
    email: Optional[str]
    origem: str
    status: str  # ex: "novo", "contatado", "qualificado"
    created_at: datetime


# "Banco" em memória (custo 0)
_LEADS: Dict[str, Lead] = {}


def criar_lead(nome: str, telefone: Optional[str], email: Optional[str], origem: str) -> Lead:
    lead_id = str(uuid4())
    lead = Lead(
        id=lead_id,
        nome=nome,
        telefone=telefone,
        email=email,
        origem=origem,
        status="novo",
        created_at=datetime.utcnow(),
    )
    _LEADS[lead_id] = lead
    return lead


def listar_leads() -> List[Lead]:
    return list(_LEADS.values())


def obter_lead(lead_id: str) -> Optional[Lead]:
    return _LEADS.get(lead_id)
