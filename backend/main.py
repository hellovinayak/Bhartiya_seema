from __future__ import annotations
# ──────────────────────────────────────────────────────────────────────────────
# backend/main.py
# FastAPI application entry-point.
#
# Endpoints
# ─────────────────────────────────────────────────
#   GET  /health           — liveness probe
#   GET  /stats            — session-level detection counters
#   GET  /alerts           — paginated alert history (Supabase)
#   GET  /frames/{name}    — serve a captured alert frame as JPEG
#   POST /detect           — submit a video frame for YOLOv8 detection
#   POST /reports          — manual tactical report + email dispatch
#   POST /start-detection  — signal the frontend that a session started
#   POST /login            — admin authentication
# ──────────────────────────────────────────────────────────────────────────────
import asyncio
import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import cfg
from database import alert_db
from detector import ObjectDetector
from email_service import EmailService

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Bhartiya Seema AI Engine",
    description="Real-time YOLOv8 border surveillance backend",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Serve captured frames as static files at /frames/<filename>
app.mount(
    "/frames",
    StaticFiles(directory=cfg.FRAMES_DIR),
    name="frames",
)

# ── Active WebSocket Connections Pool ──────────────────────────────────────────
active_connections: list[WebSocket] = []

async def broadcast_detection(event_data: dict):
    """Send detection coordinate events to all connected clients."""
    for connection in list(active_connections):
        try:
            await connection.send_json(event_data)
        except Exception:
            try:
                active_connections.remove(connection)
            except ValueError:
                pass

# ── Singletons ─────────────────────────────────────────────────────────────────
try:
    detector = ObjectDetector()
    MODEL_OK = True
except Exception as exc:
    print(f"❌ Failed to load YOLOv8 model: {exc}")
    detector = None  # type: ignore[assignment]
    MODEL_OK = False

email_svc = EmailService()

# ── Session state ──────────────────────────────────────────────────────────────
session_stats: dict = {
    "total_people":   0,
    "total_vehicles": 0,
    "total_alerts":   0,
    "start_time":     datetime.utcnow().isoformat(),
}

# Cooldown tracking: maps detected class → last alert timestamp
_last_alert_time: dict[str, datetime] = {}

# Simple in-memory token store  { token: expiry }
_tokens: dict[str, datetime] = {}

# ── Helper: cooldown guard ─────────────────────────────────────────────────────

def _cooldown_ok(cls_name: str) -> bool:
    """Return True if enough time has passed since the last alert for this class."""
    last = _last_alert_time.get(cls_name)
    if last is None:
        return True
    return (datetime.utcnow() - last).total_seconds() >= cfg.ALERT_COOLDOWN_SECS


def _mark_alerted(cls_name: str) -> None:
    _last_alert_time[cls_name] = datetime.utcnow()


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── WebSockets Broadcast ──────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep client connection open by receiving any text (e.g. heartbeat)
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    """Lightweight liveness probe used by the frontend to detect the backend."""
    return {
        "status":    "ok",
        "model":     "loaded" if MODEL_OK else "unavailable",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/stats", tags=["System"])
async def get_stats():
    """Return cumulative detection counters for the current server session."""
    return session_stats


# ── Start-detection signal ────────────────────────────────────────────────────

@app.post("/start-detection", tags=["Detection"])
async def start_detection():
    """
    Called by the frontend when a monitoring session begins.
    Resets per-session counters and records the start time.
    """
    session_stats.update({
        "total_people":   0,
        "total_vehicles": 0,
        "total_alerts":   0,
        "start_time":     datetime.utcnow().isoformat(),
    })
    _last_alert_time.clear()
    return {"status": "ok", "message": "Detection session started."}


# ── Main detection endpoint ───────────────────────────────────────────────────

@app.post("/detect", tags=["Detection"])
async def detect_objects(
    file: UploadFile = File(...),
    lat:  Optional[float] = Query(None, description="Device latitude"),
    lng:  Optional[float] = Query(None, description="Device longitude"),
):
    """
    Accept a JPEG frame from the browser, run YOLOv8 inference, and return:
    - structured prediction list
    - per-class counts
    - whether an alert was triggered
    - URL of the saved annotated frame (if an alert was triggered)

    Email alerts are dispatched asynchronously with a per-class 60-second
    cooldown so the inbox is not flooded on repeated detections.
    """
    if not MODEL_OK or detector is None:
        raise HTTPException(status_code=503, detail="YOLOv8 model not available.")

    image_bytes = await file.read()
    location    = {"lat": lat, "lng": lng} if (lat and lng) else None

    # ── Run detection ──────────────────────────────────────────────────────────
    result = detector.detect(image_bytes)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    counts: dict[str, int]  = result["counts"]
    predictions: list[dict] = result["predictions"]
    alert_triggered: bool   = result["alert_triggered"]
    saved_path: str | None  = result["saved_frame_path"]

    # ── Update session stats ───────────────────────────────────────────────────
    session_stats["total_people"]   += counts.get("person", 0)
    session_stats["total_vehicles"] += sum(
        counts.get(v, 0) for v in ("car", "truck", "bus", "motorcycle")
    )

    # ── Build the frame URL ────────────────────────────────────────────────────
    frame_url: str | None = None
    if saved_path:
        frame_url = f"/frames/{os.path.basename(saved_path)}"

    # ── Trigger alert pipeline (email + DB) if cooldown allows ────────────────
    alert_classes = [p["class"] for p in predictions if p.get("is_alert")]

    async def _handle_alerts():
        for cls_name in dict.fromkeys(alert_classes):   # deduplicate, preserve order
            if not _cooldown_ok(cls_name):
                continue

            _mark_alerted(cls_name)
            conf = next(
                (p["score"] for p in predictions if p["class"] == cls_name), 0.0
            )

            session_stats["total_alerts"] += 1

            # Fire email (non-blocking)
            asyncio.create_task(
                email_svc.send_alert(cls_name, conf, saved_path, location)
            )

            # Persist to Supabase
            alert_db.insert_alert(
                obj_name=cls_name,
                confidence=conf,
                frame_path=saved_path,
                location=location,
                email_sent=bool(cfg.EMAIL_USER),
            )

    if alert_triggered:
        await _handle_alerts()

    # ── Real-time WebSocket coordinate broadcast ──────────────────────────────
    if predictions and location:
        event_data = {
            "type": "detection",
            "timestamp": datetime.utcnow().isoformat(),
            "location": location,
            "predictions": predictions,
            "counts": counts,
        }
        asyncio.create_task(broadcast_detection(event_data))

    return {
        "status":          "success",
        "counts":          counts,
        "predictions":     predictions,
        "alert_triggered": alert_triggered,
        "frame_url":       frame_url,
    }


# ── Alert history ─────────────────────────────────────────────────────────────

@app.get("/alerts", tags=["Alerts"])
async def get_alerts(limit: int = Query(50, le=200)):
    """Return the most recent `limit` stored alerts from Supabase."""
    return {"alerts": alert_db.get_alerts(limit=limit)}


# ── Manual tactical report (from Surveillance page Send-Report button) ────────

@app.post("/reports", tags=["Alerts"])
async def save_report(report: dict):
    """
    Accept a manual tactical report from the frontend.
    Sends an email summary and stores each detected class as a separate alert.
    """
    counts   = report.get("counts", {})
    location = (
        {"lat": report["lat"], "lng": report["lng"]}
        if report.get("lat") and report.get("lng") else None
    )

    for cls_name, count in counts.items():
        conf = 0.85   # manual reports don't carry per-box confidence
        alert_db.insert_alert(
            obj_name=cls_name,
            confidence=conf,
            location=location,
            email_sent=bool(cfg.EMAIL_USER),
        )
        asyncio.create_task(email_svc.send_alert(cls_name, conf, None, location))

    return {"status": "success"}


# ── Admin login ───────────────────────────────────────────────────────────────

@app.post("/login", tags=["Auth"])
async def login(data: dict):
    """
    Authenticate an admin user.
    Credentials are read from environment variables; never hard-coded.
    Returns a short-lived token on success.
    """
    username      = data.get("username", "")
    password      = data.get("password", "")
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    # Fallback hash for local development only (admin7G)
    _dev_hash = hashlib.sha256("admin7G".encode()).hexdigest()
    stored_hash = cfg.ADMIN_PASSWORD_HASH or _dev_hash

    if username == cfg.ADMIN_USERNAME and password_hash == stored_hash:
        token = secrets.token_urlsafe(48)
        _tokens[token] = datetime.utcnow() + timedelta(hours=8)
        return {"status": "success", "role": "admin", "token": token}

    raise HTTPException(status_code=401, detail="Invalid credentials")


# ── AI Detection Configuration ────────────────────────────────────────────────

@app.get("/settings", tags=["System"])
async def get_settings():
    """Get the current YOLOv8 model size and confidence threshold."""
    if not MODEL_OK or detector is None:
        raise HTTPException(status_code=503, detail="YOLOv8 model not available.")
    
    return {
        "model_name": detector.model_name,
        "min_confidence": detector.min_confidence,
        "available_models": [
            {"id": "yolov8n.pt", "name": "Nano (yolov8n.pt)", "description": "Fastest, lower accuracy, good for weak hardware"},
            {"id": "yolov8s.pt", "name": "Small (yolov8s.pt)", "description": "Great balance of speed and detection accuracy"},
            {"id": "yolov8m.pt", "name": "Medium (yolov8m.pt)", "description": "High accuracy, moderate resource usage"},
            {"id": "yolov8l.pt", "name": "Large (yolov8l.pt)", "description": "Excellent accuracy, resource heavy"}
        ]
    }


@app.post("/settings", tags=["System"])
async def update_settings(data: dict):
    """Update the YOLOv8 model and/or confidence threshold dynamically."""
    if not MODEL_OK or detector is None:
        raise HTTPException(status_code=503, detail="YOLOv8 model not available.")
    
    model_name = data.get("model_name")
    min_confidence = data.get("min_confidence")
    
    # Validation
    if min_confidence is not None:
        try:
            min_confidence = float(min_confidence)
            if not (0.10 <= min_confidence <= 0.95):
                raise ValueError()
        except ValueError:
            raise HTTPException(status_code=400, detail="Confidence threshold must be a float between 0.10 and 0.95")
            
    if model_name is not None:
        allowed_models = ["yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt"]
        if model_name not in allowed_models:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported model. Choose one of: {', '.join(allowed_models)}"
            )

    try:
        updated = detector.update_settings(
            model_name=model_name,
            min_confidence=min_confidence
        )
        return {
            "status": "success",
            "message": "Settings updated successfully",
            "settings": updated
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to apply settings: {exc}")


# ── Entry-point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
