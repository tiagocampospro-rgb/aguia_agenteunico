from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import uuid4


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Lead:
    id: str
    nome: str
    canal: str = "whatsapp"
    telefone: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=now_utc)
    last_contact_at: Optional[datetime] = None


@dataclass
class Interaction:
    id: str
    lead_id: str
    tipo: str
    note: str = ""
    at: datetime = field(default_factory=now_utc)


class CRMService:
    """
    MVP sem banco: tudo em memória.
    Depois trocamos por SQLite mantendo a mesma interface.
    """
    def __init__(self) -> None:
        self.leads: Dict[str, Lead] = {}
        self.interactions: List[Interaction] = []

    def create_lead(self, nome: str, canal: str, telefone: Optional[str], tags: List[str]) -> Lead:
        lead = Lead(id=str(uuid4()), nome=nome, canal=canal, telefone=telefone, tags=tags)
        self.leads[lead.id] = lead
        return lead

    def list_leads(self) -> List[Lead]:
        return list(self.leads.values())

    def get_lead(self, lead_id: str) -> Lead:
        if lead_id not in self.leads:
            raise KeyError("Lead não encontrado")
        return self.leads[lead_id]

    def add_interaction(self, lead_id: str, tipo: str, note: str = "") -> Interaction:
        lead = self.get_lead(lead_id)
        inter = Interaction(id=str(uuid4()), lead_id=lead_id, tipo=tipo, note=note)
        self.interactions.append(inter)

        # Atualiza "último contato" para alguns tipos
        if tipo in {"mensagem_enviada", "resposta", "agendamento", "compra"}:
            lead.last_contact_at = inter.at

        return inter

    def lead_last_activity(self, lead_id: str) -> Optional[datetime]:
        lead = self.get_lead(lead_id)
        return lead.last_contact_at

    def cold_leads(self, days_without_contact: int = 30) -> List[Lead]:
        cutoff = now_utc() - timedelta(days=days_without_contact)
        cold: List[Lead] = []

        for lead in self.leads.values():
            last = lead.last_contact_at or lead.created_at
            if last < cutoff:
                cold.append(lead)

        # mais antigos primeiro (pra priorizar)
        cold.sort(key=lambda l: (l.last_contact_at or l.created_at))
        return cold

    def reminder_suggestion(self, lead: Lead) -> str:
        # Mensagem neutra, “implícita”, boa para recorrência (barbearia etc.)
        nome = lead.nome.split(" ")[0] if lead.nome else "tudo bem"
        return (
            f"Oi {nome}! Tudo certo? 😊\n"
            f"Passando pra te avisar que essa semana tem horários legais disponíveis.\n"
            f"Quer que eu te mande as opções?"
        )


crm_service = CRMService()
