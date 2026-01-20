from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.services.crm_service import Lead


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def days_between(a: datetime, b: datetime) -> int:
    return int((b - a).total_seconds() // 86400)


@dataclass
class Decision:
    lead_id: str
    score: int
    nivel: str  # "baixa" | "media" | "alta" | "urgente"
    razoes: List[str]
    proxima_acao: str
    mensagem_sugerida: str


class DecisionService:
    """
    Motor de priorização (0 custo): heurísticas simples + explicáveis.
    Depois podemos trocar por IA e manter a mesma interface.
    """

    def score_lead(self, lead: Lead) -> Decision:
        razoes: List[str] = []
        score = 0

        base_date = lead.last_contact_at or lead.created_at
        dias = days_between(base_date, now_utc())

        # 1) Tempo sem contato (peso principal)
        if dias >= 45:
            score += 50
            razoes.append(f"{dias} dias sem contato (muito tempo)")
        elif dias >= 30:
            score += 35
            razoes.append(f"{dias} dias sem contato")
        elif dias >= 14:
            score += 20
            razoes.append(f"{dias} dias sem contato (atenção)")
        else:
            score += 5
            razoes.append(f"{dias} dias sem contato")

        # 2) Tags que indicam recorrência / alto LTV
        tags = set(t.lower() for t in (lead.tags or []))
        if "recorrente" in tags:
            score += 20
            razoes.append("tag: recorrente (alto LTV)")
        if "vip" in tags:
            score += 15
            razoes.append("tag: vip (prioridade)")
        if "quente" in tags:
            score += 10
            razoes.append("tag: quente (intenção)")
        if "barbearia" in tags or "corte" in tags:
            score += 8
            razoes.append("tag: serviço recorrente (barbearia/corte)")
        if "indicacao" in tags or "indicação" in tags:
            score += 6
            razoes.append("tag: indicação (rede)")

        # 3) Canal com melhor resposta
        if (lead.canal or "").lower() == "whatsapp":
            score += 5
            razoes.append("canal: WhatsApp (alta resposta)")

        # Nível
        if score >= 80:
            nivel = "urgente"
        elif score >= 60:
            nivel = "alta"
        elif score >= 35:
            nivel = "media"
        else:
            nivel = "baixa"

        # Próxima ação e mensagem (implícita)
        first_name = (lead.nome or "tudo bem").split(" ")[0]

        if nivel in {"urgente", "alta"}:
            proxima_acao = "Enviar lembrete de retorno com horários"
            mensagem = (
                f"Oi {first_name}! Tudo certo? 😊\n"
                f"Essa semana abriu uns horários bem bons.\n"
                f"Quer que eu te mande as opções?"
            )
        elif nivel == "media":
            proxima_acao = "Reativar conversa (check-in leve)"
            mensagem = (
                f"Oi {first_name}! Passando só pra saber como você está 😊\n"
                f"Se quiser, posso te mandar horários disponíveis essa semana."
            )
        else:
            proxima_acao = "Acompanhar e marcar para nova checagem"
            mensagem = (
                f"Oi {first_name}! Tudo certo?\n"
                f"Quando você quiser, posso te mandar horários disponíveis. 😊"
            )

        return Decision(
            lead_id=lead.id,
            score=score,
            nivel=nivel,
            razoes=razoes,
            proxima_acao=proxima_acao,
            mensagem_sugerida=mensagem,
        )


decision_service = DecisionService()
