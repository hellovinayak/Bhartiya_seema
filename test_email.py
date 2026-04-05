#!/usr/bin/env python3
"""
Test script to send email alert for person detection
Run: python test_email.py
"""
import requests
import json
from datetime import datetime

# Backend URL
BASE_URL = "http://localhost:8000"

# Test report data for person detection
test_report = {
    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "counts": {
        "person": 3,
        "car": 1,
        "bicycle": 2
    },
    "location": "Sector 7G",
    "total_people": 3,
    "total_vehicles": 1,
    "id": f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}"
}

def send_test_alert():
    """Send a test email alert"""
    try:
        print("📧 Sending test email alert...")
        print(f"   Person detected: {test_report['total_people']}")
        print(f"   Vehicles detected: {test_report['total_vehicles']}")
        
        response = requests.post(
            f"{BASE_URL}/reports",
            json=test_report,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Email alert sent successfully!")
            print(f"   Response: {result}")
            return True
        else:
            print(f"\n❌ Failed to send alert: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to backend server")
        print("   Make sure the backend is running: python backend/main.py")
        return False
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    send_test_alert()

