from __future__ import annotations
# ──────────────────────────────────────────────────────────────────────────────
# backend/database.py
# Supabase alert storage layer.
# Reads from / writes to the `alerts` table.
# Falls back gracefully when Supabase is not configured.
# ──────────────────────────────────────────────────────────────────────────────
import os
from datetime import datetime
from typing import Any

from config import cfg

# Initialise Supabase client (optional dependency)
supabase = None
try:
    from supabase import create_client
    if cfg.SUPABASE_URL and cfg.SUPABASE_KEY:
        supabase = create_client(cfg.SUPABASE_URL, cfg.SUPABASE_KEY)
        print("✅ Supabase connected.")
    else:
        print("⚠️  Supabase keys missing — alert history disabled.")
except ImportError:
    print("⚠️  supabase-py not installed — alert history disabled.")


class AlertDB:
    """CRUD helpers for the Supabase `alerts` table."""

    TABLE = "alerts"

    # ── Write ──────────────────────────────────────────────────────────────────

    def insert_alert(
        self,
        obj_name:    str,
        confidence:  float,
        frame_path:  str | None = None,
        location:    dict | None = None,
        email_sent:  bool = False,
    ) -> dict | None:
        """
        Insert a new alert row and return the inserted record.
        `frame_path` is stored as the filename only (served via /frames/<name>).
        """
        if supabase is None:
            return None

        filename = os.path.basename(frame_path) if frame_path else None

        payload: dict[str, Any] = {
            "title":          "Tactical AI Detection",
            "description":    (
                f"Live Detection: {obj_name} spotted with "
                f"{confidence:.0%} confidence in restricted zone."
            ),
            "priority":       "critical" if obj_name == "person" else "high",
            "detected_class": obj_name,
            "detected_count": 1,
            "confidence":     round(confidence * 100, 1),
            "frame_filename": filename,
            "email_sent":     email_sent,
            "timestamp":      datetime.utcnow().isoformat(),
        }

        if location:
            payload["lat"] = location.get("lat")
            payload["lng"] = location.get("lng")

        try:
            resp = supabase.table(self.TABLE).insert(payload).execute()
            print(f"✅ Alert stored in Supabase: {obj_name}")
            return resp.data[0] if resp.data else None
        except Exception as exc:
            print(f"❌ Supabase insert failed: {exc}")
            return None

    # ── Read ───────────────────────────────────────────────────────────────────

    def get_alerts(self, limit: int = 50) -> list[dict]:
        """Fetch the most recent `limit` alerts, newest first."""
        if supabase is None:
            return []
        try:
            resp = (
                supabase.table(self.TABLE)
                .select("*")
                .order("timestamp", desc=True)
                .limit(limit)
                .execute()
            )
            return resp.data or []
        except Exception as exc:
            print(f"❌ Supabase fetch failed: {exc}")
            return []


# Singleton used throughout the app
alert_db = AlertDB()
