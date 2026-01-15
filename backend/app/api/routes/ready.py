import os
from fastapi import APIRouter, HTTPException

router = APIRouter()

REQUIRED_ENV_VARS = [
    "APP_ENV"
]

@router.get("/ready", tags=["Infra"])
def readiness_check():
    """
    Verifica se a aplicação está pronta para receber tráfego.
    Aqui checamos apenas configurações essenciais.
    """

    missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]

    if missing_vars:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "type": "readiness",
                "missing_env_vars": missing_vars
            }
        )

    return {
        "status": "ok",
        "service": "AG.U.IA",
        "type": "readiness",
        "message": "Aplicação pronta para receber tráfego"
    }
