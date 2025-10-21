# /cybermind_aviator/app.py

import random
import time
import json
from flask import Flask, render_template, jsonify, request
import requests # <-- ADDED IMPORT

app = Flask(__name__)

# --- Nominatim API for Geocoding ---
NOMINATIM_API = "https://nominatim.openstreetmap.org"

# --- Existing Data Simulation Functions ---

def get_system_status():
    """Simulates overall system status."""
    return {
        "connection": random.randint(85, 98),
        "system_time": time.strftime("%H:%M:%S"),
        "gps_status": "STRONG",
        "emergency_alerts": random.randint(1, 5)
    }

def get_dashboard_data():
    """Simulates data for the main dashboard controllers."""
    controllers = [
        {"name": "Neural Pilot Alpha", "type": "Primary Navigation"},
        {"name": "Precision Navigator", "type": "GPS Coordination"},
        {"name": "Threat Detection AI", "type": "Security Monitor"},
        {"name": "Weather Adaptive", "type": "Environmental"},
        {"name": "Emergency Override", "type": "Manual Backup"},
    ]
    for i, controller in enumerate(controllers):
        controller["status"] = "ACTIVE" if i < 2 else "STANDBY"
        controller["accuracy"] = f"{random.uniform(84.0, 99.9):.2f}%"
        controller["response_time"] = f"{random.uniform(2.0, 25.0):.2f}ms"
        controller["last_update"] = time.strftime("%H:%M:%S")
    return {
        "controllers": controllers,
        "co_drive_logs": get_co_drive_logs(),
        "cyber_threats": get_cyber_threats()
    }

def get_co_drive_logs():
    """Simulates Co-Drive panel logs."""
    logs = [
        {"time": "18:11:41", "type": "Real-time system update", "source": "Precision Navigator", "message": "Automated system check completed.", "status": "COMPLETED"},
        {"time": "09:21:45", "type": "Controller handover initiated", "source": "Neural Pilot Alpha", "message": "Switching to AI Autopilot.", "status": "COMPLETED"},
        {"time": "09:19:15", "type": "Cyber Threat Detected", "source": "Cyber Threat Monitor", "message": "GPS Spoofing attack mitigated.", "status": "ACTIVE"},
    ]
    return random.sample(logs, k=random.randint(2,3))

def get_cyber_threats():
    """Simulates cyber threats."""
    threats = [
        {"type": "GPS Spoofing Detected", "details": "Suspicious GPS signals detected...", "status": "ACTIVE", "confidence": 87},
        {"type": "Communication Jamming", "details": "Intermittent signal interference detected...", "status": "MONITORING", "confidence": 64},
        {"type": "Network Scan Attempt", "details": f"Unauthorized scan from 192.168.1.{random.randint(10,200)} blocked.", "status": "BLOCKED", "confidence": 92},
    ]
    return random.sample(threats, k=random.randint(1,2))

# --- Existing Flask Routes (Unchanged) ---

@app.route("/")
def home():
    return render_template("index.html", title="Main Control Dashboard")

@app.route("/gps-console")
def gps_console():
    return render_template("gps_console.html", title="GPS Console")

@app.route("/surveillance")
def surveillance():
    return render_template("surveillance.html", title="Surveillance")

@app.route("/manual-control")
def manual_control():
    return render_template("manual_control.html", title="Manual Control")

@app.route("/alerts")
def alerts():
    return render_template("alerts.html", title="System Alerts")

# --- Existing and NEW API Endpoints ---

@app.route("/api/dashboard_data")
def api_dashboard_data():
    data = get_dashboard_data()
    data['system_status'] = get_system_status()
    return jsonify(data)

# THIS IS THE NEW GPS POINT GENERATION ENDPOINT
@app.route("/api/generate_gps_points", methods=['POST'])
def api_generate_gps_points():
    data = request.get_json()
    try:
        lat_base = float(data.get('lat'))
        lon_base = float(data.get('lon'))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid or missing lat/lon"}), 400

    points = []
    # Generate 50 points as requested
    for i in range(50):
        points.append({
            "id": f"#{random.randint(1000, 9999) + i}",
            "lat": lat_base + random.uniform(-0.0005, 0.0005), # Tighter cluster
            "lon": lon_base + random.uniform(-0.0005, 0.0005), # Tighter cluster
            "alt": f"{random.uniform(190.0, 200.0):.1f}m",
            "acc": f"±{random.uniform(1.5, 5.0):.2f}m",
            "quality": random.choice(["Excellent", "Good", "Acceptable"])
        })
    return jsonify(points)

# THIS IS THE NEW GEOCODING ENDPOINT
@app.route('/api/geocode', methods=['POST'])
def geocode():
    data = request.get_json()
    address = data.get('address')
    if not address:
        return jsonify({'error': 'Address is required'}), 400

    url = f"{NOMINATIM_API}/search"
    params = {'q': address, 'format': 'json', 'limit': 1}
    # IMPORTANT: You should use a real email or contact for the User-Agent
    headers = {'User-Agent': 'CyberMindAviator/1.0 (dev@example.com)'}
    
    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status() # Raise an exception for bad status codes
        api_data = response.json()
        if api_data:
            location = api_data[0]
            return jsonify({'lat': float(location['lat']), 'lon': float(location['lon'])})
        else:
            return jsonify({'error': 'Location not found'}), 404
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {e}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/surveillance_data")
def api_surveillance_data():
    objects = [
        {"type": "Vehicle", "confidence": 89.8, "x": 0.3, "y": 0.4},
        {"type": "Personnel", "confidence": 89.7, "x": 0.7, "y": 0.6},
    ]
    return jsonify(random.sample(objects, k=random.randint(1,2)))
    
@app.route("/api/flight_parameters")
def api_flight_parameters():
  return jsonify({
    "speed": f"{random.uniform(0, 60):.1f}", "altitude": f"{random.uniform(150, 500):.1f}",
  })

if __name__ == "__main__":
    app.run(debug=True)