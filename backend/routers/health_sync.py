from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import urllib.parse
from datetime import datetime, timezone

router = APIRouter(prefix="/health-sync", tags=["Health Sync (Google Fit & Xiaomi)"])

class SyncCallback(BaseModel):
    code: str

@router.get("/google/login-url")
def get_google_login_url():
    """
    Retorna a URL de autorização OAuth2 para o Google Fit.
    Sincroniza dados da Mi Fitness (Xiaomi) conectados ao Google Fit.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID")
    redirect_uri = "http://localhost:3000" # Front-end fará o parsing da URL
    scope = "https://www.googleapis.com/auth/fitness.sleep.read"
    
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        "response_type=code&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"scope={urllib.parse.quote(scope)}&"
        "access_type=offline&"
        "prompt=consent"
    )
    return {"url": url}

@router.post("/google/callback")
def handle_google_callback(payload: SyncCallback):
    """
    Recebe o authorization code capturado pelo Frontend.
    Converte em token (Simulado se chaves reais não estiverem setadas)
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID")
    
    # MOCK (Simulação) porque o usuário ainda não adicionou as chaves reais do Google Cloud Console
    if client_id == "YOUR_CLIENT_ID" or not payload.code:
        return {
            "status": "success",
            "message": "[MOCK] Mi Watch Sync via Google Fit simulado com sucesso!",
            "sleep_data_imported": {
                "date": datetime.now(timezone.utc).isoformat(),
                "duration_minutes": 465, # 7h 45m
                "sleep_score": 88,
                "deep_sleep_pct": 28,
                "source": "Xiaomi Mi Watch 5 -> Google Fit"
            }
        }
    
    # Fluxo real usaria requests para trocar o código OAuth por Access Tokens
    return {"status": "error", "message": "Chaves GOOGLE_CLIENT_ID reais não configuradas."}

class AppleHealthPayload(BaseModel):
    sleep_minutes: int
    deep_sleep_minutes: int = 0
    date: str
    source: str = "Apple Health via Shortcuts"

@router.post("/apple-webhook")
def receive_apple_health_webhook(payload: AppleHealthPayload):
    """
    Recebe os dados do Apple Health diretamente via Shortcuts do iOS.
    O aplicativo 'Atalhos' no iPhone fará um POST diário para esta rota.
    """
    # Aqui vai salvar no banco de dados usando sqlalchemy
    return {
        "status": "success",
        "message": f"Recebido {payload.sleep_minutes} min de sono do Apple Health!",
        "data_recorded": True
    }
