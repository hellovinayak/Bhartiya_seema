# ──────────────────────────────────────────────────────────────────────────────
# backend/config.py
# Centralised environment-variable configuration.
# All secrets are read from the project-root .env file.
# ──────────────────────────────────────────────────────────────────────────────
import os
from dotenv import load_dotenv

# Walk up one level from backend/ so we always load the project-root .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


class Config:
    # ── Supabase ──────────────────────────────────────────────────────────────
    SUPABASE_URL: str  = os.environ.get("VITE_SUPABASE_URL", "")
    # Prefer the privileged service-role key for server-side writes
    SUPABASE_KEY: str  = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("VITE_SUPABASE_ANON_KEY", "")
    )

    # ── Email ─────────────────────────────────────────────────────────────────
    SMTP_SERVER:   str = os.environ.get("SMTP_SERVER",   "smtp.gmail.com")
    SMTP_PORT:     int = int(os.environ.get("SMTP_PORT", "587"))
    EMAIL_USER:    str = os.environ.get("EMAIL_USER",    "")
    EMAIL_PASS:    str = os.environ.get("EMAIL_PASS",    "")
    ADMIN_EMAIL:   str = os.environ.get("ADMIN_EMAIL",   "sidd902003@gmail.com")

    # ── Admin auth ────────────────────────────────────────────────────────────
    ADMIN_USERNAME:      str = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD_HASH: str = os.environ.get("ADMIN_PASSWORD_HASH", "")

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:5173"
    ).split(",")

    # ── Detection ─────────────────────────────────────────────────────────────
    MIN_CONFIDENCE:        float = float(os.environ.get("MIN_CONFIDENCE", "0.70"))
    ALERT_COOLDOWN_SECS:   int   = int(os.environ.get("ALERT_COOLDOWN_SECS", "60"))
    YOLO_MODEL:            str   = os.environ.get("YOLO_MODEL", "yolov8n.pt")

    # ── Paths ─────────────────────────────────────────────────────────────────
    FRAMES_DIR: str = os.path.join(os.path.dirname(__file__), "captured_frames")


cfg = Config()
os.makedirs(cfg.FRAMES_DIR, exist_ok=True)
