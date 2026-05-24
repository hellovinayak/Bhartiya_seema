from __future__ import annotations
# ──────────────────────────────────────────────────────────────────────────────
# backend/email_service.py
# Async email alert service.
# Sends a formatted alert email with the captured annotated frame attached.
# SMTP calls are dispatched to a thread-pool so they never block the event loop.
# ──────────────────────────────────────────────────────────────────────────────
import asyncio
import os
import smtplib
from datetime import datetime
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import cfg


class EmailService:
    """Send border-alert emails with an optional captured-frame attachment."""

    # ── Public API ─────────────────────────────────────────────────────────────

    async def send_alert(
        self,
        obj_name:   str,
        confidence: float,
        frame_path: str | None = None,
        location:   dict | None = None,
    ) -> bool:
        """
        Asynchronously send an alert email.
        Returns True on success, False otherwise.
        Does nothing (and returns False) when email credentials are missing.
        """
        if not (cfg.EMAIL_USER and cfg.EMAIL_PASS):
            print("⚠️  Email credentials not set (EMAIL_USER / EMAIL_PASS). Skipping alert.")
            return False

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._send_sync, obj_name, confidence, frame_path, location
        )

    # ── Private ────────────────────────────────────────────────────────────────

    def _send_sync(
        self,
        obj_name:   str,
        confidence: float,
        frame_path: str | None,
        location:   dict | None,
    ) -> bool:
        """Blocking SMTP send — called from a thread-pool executor."""
        try:
            msg = MIMEMultipart()
            msg["From"]    = cfg.EMAIL_USER
            msg["To"]      = cfg.ADMIN_EMAIL
            msg["Subject"] = "🚨 Border Alert: Suspicious Object Detected"

            loc_str = (
                f"{location['lat']:.5f}° N, {location['lng']:.5f}° E"
                if location else "Unavailable"
            )

            body = (
                f"Suspicious movement detected near the border.\n\n"
                f"Object detected : {obj_name}\n"
                f"Confidence      : {confidence:.1%}\n"
                f"Time            : {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}\n"
                f"GPS Location    : {loc_str}\n\n"
                f"Please verify immediately.\n\n"
                f"{'—' * 50}\n"
                f"Bhartiya Seema AI Surveillance System 🇮🇳\n"
                f"JAI HIND"
            )
            msg.attach(MIMEText(body, "plain"))

            # Attach the annotated frame image if it was saved
            if frame_path and os.path.exists(frame_path):
                with open(frame_path, "rb") as fh:
                    img_bytes = fh.read()
                attachment = MIMEImage(img_bytes, name=os.path.basename(frame_path))
                attachment.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=os.path.basename(frame_path),
                )
                msg.attach(attachment)

            server = smtplib.SMTP(cfg.SMTP_SERVER, cfg.SMTP_PORT, timeout=15)
            server.starttls()
            server.login(cfg.EMAIL_USER, cfg.EMAIL_PASS)
            server.sendmail(cfg.EMAIL_USER, cfg.ADMIN_EMAIL, msg.as_string())
            server.quit()

            print(f"✅ Alert email sent → {cfg.ADMIN_EMAIL}  [{obj_name}  {confidence:.0%}]")
            return True

        except Exception as exc:
            print(f"❌ Email send failed: {exc}")
            return False
