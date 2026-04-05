import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from frontend .env 
# assuming backend runs from project root or inside backend folder
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase integration active.")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
else:
    print("⚠️  WARNING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env. Database logging disabled.")

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 model (downloads automatically on first run)
model = YOLO('yolov8n.pt') 

session_stats = {
    "total_people": 0,
    "total_vehicles": 0,
    "start_time": None
}

# Email configuration - Update these with your SMTP settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "sid902003@gmail.com"  # Your Gmail address
SMTP_PASSWORD = "ckto acpz acmx hfsh"  # Gmail App Password (16 chars)
ADMIN_EMAIL = "vinay22345666@gmail.com"

def send_email_alert(report):
    """Send email alert to admin with detection report"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = ADMIN_EMAIL
        msg['Subject'] = f"🚨 BATTALION COMMAND ALERT - AI DETECTION - {report.get('timestamp', '')}"
        
        body = f"""
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
"""
        counts = report.get('counts', {})
        if counts:
            for obj, count in counts.items():
                body += f"   • {obj.upper()}: {count}\n"
        else:
            body += "   No objects detected in current frame.\n"
        
        body += """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated message from the Bhartiya Seema 
AI Surveillance System. 

Stay Alert! Stay Safe!
🇮🇳 JAI HIND 🇮🇳
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, ADMIN_EMAIL, msg.as_string())
        server.quit()
        
        print(f"✅ Email alert sent successfully to {ADMIN_EMAIL}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False

@app.get("/stats")
async def get_stats():
    return session_stats

@app.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    # Read image file
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run YOLOv8 inference
    results = model(img, stream=True)
    
    current_frame_counts = {"person": 0, "vehicle": 0}
    other_counts = {}
    predictions = []
    
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls = int(box.cls[0])
            name = model.names[cls]
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            
            predictions.append({
                "class": name,
                "score": conf,
                "bbox": [x1, y1, x2 - x1, y2 - y1]
            })
            
            if name == 'person':
                current_frame_counts["person"] += 1
            elif name in ['car', 'truck', 'motorcycle', 'bus', 'bicycle']:
                current_frame_counts["vehicle"] += 1
            else:
                other_counts[name] = other_counts.get(name, 0) + 1

    # Update session totals
    if current_frame_counts["person"] > session_stats["total_people"]:
        session_stats["total_people"] = current_frame_counts["person"]
    if current_frame_counts["vehicle"] > session_stats["total_vehicles"]:
        session_stats["total_vehicles"] = current_frame_counts["vehicle"]

    all_counts = {**current_frame_counts, **other_counts}
    
    # Filter out zeros
    filtered_counts = {k: v for k, v in all_counts.items() if v > 0}

    return {"status": "success", "counts": filtered_counts, "predictions": predictions}

@app.post("/reports")
async def save_report(report: dict):
    # report expected: { "timestamp": "...", "counts": { ... }, "total_people": X, "total_vehicles": Y }
    
    # Convert report to an Alert in Supabase
    counts = report.get('counts', {})
    lat = report.get('lat')
    lng = report.get('lng')

    if counts and supabase:
        try:
            for cls_name, count in counts.items():
                priority = "critical" if cls_name == "person" else "high"
                description = f"Live Detection: {count} {cls_name.capitalize()}(s) spotted in restricted zone."
                
                payload = {
                    "title": "Tactical AI Detection",
                    "description": description,
                    "priority": priority,
                    "detected_class": cls_name,
                    "detected_count": count
                }
                
                if lat is not None and lng is not None:
                    payload["lat"] = lat
                    payload["lng"] = lng
                    
                supabase.table("alerts").insert(payload).execute()
            print("✅ Supabase alert logged successfully.")
        except Exception as e:
            print(f"❌ Supabase insert failed: {e}")
    
    # Send email alert to admin
    send_email_alert(report)
    
    return {"status": "success", "email_sent": True}

@app.post("/login")
async def login(data: dict):
    # Admin login - username: admin, password: admin7G
    if data.get("username") == "admin" and data.get("password") == "admin7G":
        return {"status": "success", "role": "admin", "token": "mock-adm-token"}
    return {"status": "error", "message": "Invalid credentials"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

