# Bhartiya Seema Surveillance System 🇮🇳🛡️

The **Bhartiya Seema Surveillance System** is a fully integrated, real-time surveillance and tactical response platform designed to modernize border security operations. The platform uses advanced AI object detection to identify threats, streams live incident data, and provides an interactive admin dashboard for real-time tracking, dispatching field officers, and reporting resolution.

## 🚀 Core Features

- **Live AI Object Detection**: Powered by YOLOv8, the backend precisely detects multiple threat classes (people, vehicles, specific objects) in real-time.
- **Geolocation Tracking & Map Integration**: Plots identified threats onto an interactive map with their precise coordinates.
- **Real-Time Event Pipeline**: Replaces static mock data with a live, robust Supabase-backed event architecture to instantly sync events across all endpoints.
- **Interactive Admin Dashboard**: A comprehensive command center to monitor live incidents, review alerts, and dispatch corresponding field officers.
- **Tactical Response workflows**: End-to-end incident reporting to trace from the initial alert down to resolution.
- **Secure Authentication**: Immersive military-themed portal equipped with strict, role-based secure login and registration.

## 🛠️ Technology Stack

**Frontend**
- React, Vite, TypeScript
- Tailwind CSS (For rapid UI development and modern designs)
- Supabase Client (For real-time data subscription and authentication)

**Backend / AI**
- Python
- YOLOv8 (`yolov8n.pt`) for Computer Vision & Object Detection
- Supabase (PostgreSQL Database, Real-time Subscriptions, Authentication)

## 🔄 How the Workflow Operates (Working Flow)

1. **Threat Detection**: The Python backend continuously receives video feeds/images and passes them through the YOLOv8 model.
2. **Data Ingestion & Routing**: When an object of interest is detected, the backend extracts the object class, confidence level, and timestamp. A geolocation is attached to this event.
3. **Database Syncing**: The backend pushes this event as an "Incident" directly into the Supabase PostgreSQL database.
4. **Real-time Alerting**: The React frontend is subscribed to the Supabase database. As soon as a new incident row is inserted, the admin dashboard updates instantly without needing a page refresh.
5. **Action & Dispatch**: Command center admins viewing the map/dashboard assess the threat, assign field officers, and update the incident status from *Open* to *Resolved*.

## ⚙️ Setup Instructions

### Environment Variables
Ensure you have the `.env` file populated at the root of the project with your Supabase keys:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 1. Starting the Frontend
```bash
cd frontend
npm install
npm run dev
```
*The React application will usually start on `http://localhost:5173`.*

### 2. Starting the Backend (AI Detection)
```bash
cd backend
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt # (Ensure ultralytics/yolo dependencies are installed)

# Run the detection engine
python main.py
```
