import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ultralytics import YOLO
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
import secrets
import hashlib

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
# Use service role key for backend if available, otherwise fall back to anon key
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase integration active.")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
else:
    print("⚠️  WARNING: Supabase keys missing in .env. Database logging disabled.")

app = FastAPI(title="Bhartiya Seema AI Engine", version="2.0.0")

# ──────────────────────────────────────────────
# CORS – restrict to your frontend origin only
# ──────────────────────────────────────────────
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Load YOLOv8 model (graceful failure if missing)
# ──────────────────────────────────────────────
MIN_CONFIDENCE = 0.45   # Ignore detections below 45% confidence

try:
    model_path = os.path.join(os.path.dirname(__file__), "yolov8n.pt")
    model = YOLO(model_path)
    print("✅ YOLOv8 model loaded.")
except Exception as e:
    model = None
    print(f"❌ Failed to load YOLOv8 model: {e}. /detect will return empty results.")

# ──────────────────────────────────────────────
# Session stats  (cumulative per server session)
# ──────────────────────────────────────────────
session_stats = {
    "total_people": 0,
    "total_vehicles": 0,
    "start_time": datetime.utcnow().isoformat()
}

# ──────────────────────────────────────────────
# Auth – read credentials from .env, NOT code
# ──────────────────────────────────────────────
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
# Store a SHA-256 hash of the password – never compare plaintext
ADMIN_PASSWORD_HASH = os.environ.get(
    "ADMIN_PASSWORD_HASH",
    hashlib.sha256("admin7G".encode()).hexdigest()   # fallback for local dev only
)

# Simple in-memory token store  { token: expiry_datetime }
_active_tokens: dict[str, datetime] = {}
security = HTTPBearer(auto_error=False)

TOKEN_TTL_HOURS = 8


def _issue_token() -> str:
    token = secrets.token_urlsafe(48)
    _active_tokens[token] = datetime.utcnow() + timedelta(hours=TOKEN_TTL_HOURS)
    return token


def _verify_token(credentials: HTTPAuthorizationCredentials | None) -> bool:
    """Return True if the Bearer token is valid and not expired."""
    if credentials is None:
        return False
    token = credentials.credentials
    expiry = _active_tokens.get(token)
    if expiry is None or datetime.utcnow() > expiry:
        _active_tokens.pop(token, None)
        return False
    return True


# ──────────────────────────────────────────────
# Email configuration
# ──────────────────────────────────────────────
SMTP_SERVER   = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
ADMIN_EMAIL   = os.environ.get("ADMIN_EMAIL")


def _build_email_body(report: dict) -> str:
    counts = report.get("counts", {})
    lines = "\n".join(
        f"   • {obj.upper()}: {count}" for obj, count in counts.items()
    ) or "   No objects detected in current frame."

    return f"""
╔══════════════════════════════════════════════════════════╗
║          BATTALION COMMAND - DETECTION REPORT            ║
║              BHARTIYA SEEMA SECURITY PORTAL              ║
╚══════════════════════════════════════════════════════════╝

📍 LOCATION: Tactical Sector
⏰ TIME: {report.get('timestamp', 'N/A')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DETECTION SUMMARY:
   👤 TOTAL PERSONS: {report.get('total_people', 0)}
   🚗 TOTAL VEHICLES: {report.get('total_vehicles', 0)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT DETECTIONS:
{lines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated message from the Bhartiya Seema
AI Surveillance System.

Stay Alert! Stay Safe!
🇮🇳 JAI HIND 🇮🇳
"""


async def send_email_alert_async(report: dict):
    """Send email alert in a background thread so it doesn't block the request."""
    if not (SMTP_USERNAME and SMTP_PASSWORD and ADMIN_EMAIL):
        print("⚠️  SMTP not configured. Skipping email alert.")
        return

    def _send():
        try:
            msg = MIMEMultipart()
            msg["From"]    = SMTP_USERNAME
            msg["To"]      = ADMIN_EMAIL
            msg["Subject"] = f"🚨 BATTALION COMMAND ALERT - AI DETECTION - {report.get('timestamp', '')}"
            msg.attach(MIMEText(_build_email_body(report), "plain"))

            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, ADMIN_EMAIL, msg.as_string())
            server.quit()
            print(f"✅ Email alert sent to {ADMIN_EMAIL}")
        except Exception as e:
            print(f"❌ Failed to send email: {e}")

    # Run blocking SMTP call in a thread pool so the event loop stays free
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send)


# ══════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════

@app.get("/health")
async def health():
    """Lightweight health-check endpoint for the frontend."""
    return {
        "status": "ok",
        "model": "loaded" if model else "unavailable",
        "supabase": "connected" if supabase else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/stats")
async def get_stats():
    return session_stats


@app.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="YOLOv8 model not loaded.")

    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    img      = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    results = model(img, stream=True)

    current_frame_counts: dict[str, int] = {"person": 0, "vehicle": 0}
    other_counts: dict[str, int] = {}
    predictions = []

    for result in results:
        for box in result.boxes:
            conf = float(box.conf[0])
            if conf < MIN_CONFIDENCE:
                continue                       # ← skip low-confidence detections

            cls  = int(box.cls[0])
            name = model.names[cls]
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            predictions.append({
                "class": name,
                "score": conf,
                "bbox":  [x1, y1, x2 - x1, y2 - y1]
            })

            if name == "person":
                current_frame_counts["person"] += 1
            elif name in ("car", "truck", "motorcycle", "bus", "bicycle"):
                current_frame_counts["vehicle"] += 1
            else:
                other_counts[name] = other_counts.get(name, 0) + 1

    # Accumulate session totals properly
    session_stats["total_people"]   += current_frame_counts["person"]
    session_stats["total_vehicles"] += current_frame_counts["vehicle"]

    all_counts     = {**current_frame_counts, **other_counts}
    filtered_counts = {k: v for k, v in all_counts.items() if v > 0}

    return {"status": "success", "counts": filtered_counts, "predictions": predictions}


@app.post("/reports")
async def save_report(report: dict):
    counts = report.get("counts", {})
    lat    = report.get("lat")
    lng    = report.get("lng")

    if counts and supabase:
        try:
            for cls_name, count in counts.items():
                priority    = "critical" if cls_name == "person" else "high"
                description = f"Live Detection: {count} {cls_name.capitalize()}(s) spotted in restricted zone."

                payload: dict = {
                    "title":           "Tactical AI Detection",
                    "description":     description,
                    "priority":        priority,
                    "detected_class":  cls_name,
                    "detected_count":  count,
                }

                if lat is not None and lng is not None:
                    payload["lat"] = lat
                    payload["lng"] = lng

                supabase.table("alerts").insert(payload).execute()

            print("✅ Supabase alert logged successfully.")
        except Exception as e:
            print(f"❌ Supabase insert failed: {e}")

    # Fire-and-forget email – doesn't block the HTTP response
    asyncio.create_task(send_email_alert_async(report))

    return {"status": "success", "email_queued": True}


@app.post("/login")
async def login(data: dict):
    username         = data.get("username", "")
    password         = data.get("password", "")
    password_hash    = hashlib.sha256(password.encode()).hexdigest()

    if username == ADMIN_USERNAME and password_hash == ADMIN_PASSWORD_HASH:
        token = _issue_token()
        return {"status": "success", "role": "admin", "token": token}

    raise HTTPException(status_code=401, detail="Invalid credentials")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
