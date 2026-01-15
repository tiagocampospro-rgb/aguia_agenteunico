from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Infra"])
def health_check():
    """
    Verifica se a aplicação está viva.
    NÃO checa dependências externas.
    """
    return {
        "status": "ok",
        "service": "AG.U.IA",
        "type": "liveness",
        "message": "Aplicação ativa"
    }
