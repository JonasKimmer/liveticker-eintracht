"""
Ticker Router — Aggregator
==========================
Bindet die drei Unter-Router zusammen, damit main.py unverändert bleibt.

Unter-Module:
- ticker_crud.py     — GET / DELETE / PATCH / POST manual
- ticker_generate.py — KI-Generierung (Modus 2/3)
- ticker_batch.py    — Bulk-Evaluation + Übersetzung

Modi:
- Modus 1 (manuell):        POST /ticker/manual/{match_id}
- Modus 2 (vollautomatisch): POST /ticker/generate/{event_id}
- Modus 3 (hybrid):         POST /ticker/generate/{event_id} → status=draft → PATCH /{id}/publish

Instanzen:
- generic:       neutral, kein Vereinsbezug
- ef_whitelabel: Eintracht-Stil, Few-Shot aus style_references
"""

from fastapi import APIRouter

from app.api.v1.ticker_crud import router as _crud_router
from app.api.v1.ticker_generate import router as _generate_router
from app.api.v1.ticker_batch import router as _batch_router

# Einziger öffentlicher Export — wird in main.py als ticker.router eingebunden
router = APIRouter()
router.include_router(_crud_router)
router.include_router(_generate_router)
router.include_router(_batch_router)
