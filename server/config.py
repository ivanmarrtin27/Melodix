"""Configuración del API Melodix (dev + producción)."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

_SERVER_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _SERVER_DIR.parent
# Cwd de `npm run dev:server` es la raíz: cargar ambos, con server/.env ganando.
load_dotenv(_ROOT_DIR / ".env")
load_dotenv(_SERVER_DIR / ".env", override=True)

logger = logging.getLogger("melodix")

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
ENV = os.getenv("MELODIX_ENV", "development").strip().lower()
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").strip().lower()

_raw_cors = os.getenv("MELODIX_CORS_ORIGINS", "").strip()
if _raw_cors:
    CORS_ORIGINS = [origin.strip() for origin in _raw_cors.split(",") if origin.strip()]
elif ENV == "production":
    # Fail closed: sin lista explícita no se abre a *
    CORS_ORIGINS = []
    logger.warning(
        "MELODIX_CORS_ORIGINS vacío en producción — configura orígenes permitidos"
    )
else:
    CORS_ORIGINS = ["*"]

# Capacitor WebView (Android/iOS) siempre necesita estos orígenes si la lista es explícita.
_CAPACITOR_ORIGINS = (
    "https://localhost",
    "capacitor://localhost",
    "http://localhost",
    "ionic://localhost",
)
if CORS_ORIGINS and "*" not in CORS_ORIGINS:
    for origin in _CAPACITOR_ORIGINS:
        if origin not in CORS_ORIGINS:
            CORS_ORIGINS.append(origin)

UVICORN_WORKERS = max(1, int(os.getenv("UVICORN_WORKERS", "1")))
