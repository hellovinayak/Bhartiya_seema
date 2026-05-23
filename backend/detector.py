# ──────────────────────────────────────────────────────────────────────────────
# backend/detector.py
# YOLOv8 object detection engine.
# Loads the model once at startup, processes JPEG/PNG image bytes,
# draws colour-coded bounding boxes on the annotated copy, saves alert
# frames to disk, and returns structured detection results.
# ──────────────────────────────────────────────────────────────────────────────
import cv2
import numpy as np
import os
from datetime import datetime
from ultralytics import YOLO

from config import cfg

# ── Classes we care about at the border ───────────────────────────────────────
TARGET_CLASSES: set[str] = {
    "person", "car", "truck", "motorcycle", "bus",
    "bird", "cat", "dog", "horse", "cow",
    "elephant", "bear", "zebra", "giraffe",
}

# ── Per-class bounding-box colours  (BGR) ─────────────────────────────────────
CLASS_COLORS: dict[str, tuple[int, int, int]] = {
    "person":     (0,   230, 118),   # green
    "car":        (66,  133, 244),   # blue
    "truck":      (66,  133, 244),   # blue
    "bus":        (66,  133, 244),   # blue
    "motorcycle": (255, 152,   0),   # orange
    "bird":       (255, 235,  59),   # yellow
    # animals
    "cat":        (156,  39, 176),
    "dog":        (156,  39, 176),
    "horse":      (156,  39, 176),
    "cow":        (156,  39, 176),
    "elephant":   (156,  39, 176),
    "bear":       (239,  83,  80),   # red-ish
    "_default":   (100, 100, 255),
}


class ObjectDetector:
    """
    Wraps a YOLOv8 model and exposes a single `detect()` method.
    Thread-safe for concurrent requests because YOLO inference is GIL-bound.
    """

    def __init__(self) -> None:
        model_path = os.path.join(os.path.dirname(__file__), cfg.YOLO_MODEL)
        if not os.path.exists(model_path):
            # Let Ultralytics auto-download to the default cache
            model_path = cfg.YOLO_MODEL
        self.model = YOLO(model_path)
        print(f"✅ YOLOv8 model loaded: {model_path}")

    # ── Public API ─────────────────────────────────────────────────────────────

    def detect(self, image_bytes: bytes) -> dict:
        """
        Run YOLOv8 inference on raw image bytes.

        Returns
        -------
        {
          "predictions": [ {class, score, bbox, is_alert} ],
          "counts":      { class_name: count },
          "alert_triggered": bool,
          "saved_frame_path": str | None,   # absolute path on disk
        }
        """
        img = self._decode(image_bytes)
        if img is None:
            return {"error": "Could not decode image",
                    "predictions": [], "counts": {},
                    "alert_triggered": False, "saved_frame_path": None}

        annotated   = img.copy()
        predictions = []
        counts:      dict[str, int] = {}
        alert_triggered = False

        for result in self.model(img, stream=True, verbose=False):
            for box in result.boxes:
                conf = float(box.conf[0])
                if conf < cfg.MIN_CONFIDENCE:
                    continue

                cls_id  = int(box.cls[0])
                name    = self.model.names[cls_id]
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                is_alert = name in TARGET_CLASSES

                predictions.append({
                    "class":    name,
                    "score":    round(conf, 4),
                    "bbox":     [x1, y1, x2 - x1, y2 - y1],
                    "is_alert": is_alert,
                })
                counts[name] = counts.get(name, 0) + 1

                if is_alert:
                    alert_triggered = True

                # Draw annotation on the frame copy
                self._draw_box(annotated, name, conf, x1, y1, x2, y2)

        # Persist the annotated frame if any alert class was detected
        saved_path: str | None = None
        if alert_triggered:
            saved_path = self._save_frame(annotated)

        return {
            "predictions":    predictions,
            "counts":         counts,
            "alert_triggered": alert_triggered,
            "saved_frame_path": saved_path,
        }

    # ── Private helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _decode(image_bytes: bytes):
        """Decode JPEG/PNG bytes to an OpenCV BGR image."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    def _draw_box(
        self,
        img,
        name: str,
        conf: float,
        x1: int, y1: int,
        x2: int, y2: int,
    ) -> None:
        """Draw a labelled bounding box on `img` in-place."""
        color    = CLASS_COLORS.get(name, CLASS_COLORS["_default"])
        label    = f"{name.upper()}  {conf:.0%}"
        font     = cv2.FONT_HERSHEY_SIMPLEX
        scale    = 0.55
        thickness = 2

        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)

        # Label background
        (tw, th), _ = cv2.getTextSize(label, font, scale, thickness)
        label_y = y1 - 6 if y1 > th + 6 else y2 + th + 6
        cv2.rectangle(img, (x1, label_y - th - 4), (x1 + tw + 4, label_y + 2), color, -1)
        cv2.putText(img, label, (x1 + 2, label_y), font, scale, (255, 255, 255), thickness)

    @staticmethod
    def _save_frame(img) -> str:
        """Save an annotated frame to the captured_frames directory."""
        ts       = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"alert_{ts}.jpg"
        path     = os.path.join(cfg.FRAMES_DIR, filename)
        cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        print(f"📸 Frame saved: {filename}")
        return path
