import os
import math
import requests
from typing import List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()  # read config from a local .env file if present

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import firebase_admin
from firebase_admin import credentials, firestore
import networkx as nx

app = FastAPI(
    title="ALVIN Backend Engine",
    description="Core infrastructure, routing, and Firebase bridge for Project ALVIN",
    version="1.0.0"
)

# --- CONFIG (via environment variables; see .env.example) ---
# Comma-separated list of allowed frontend origins.
CORS_ORIGINS = os.getenv(
    "ALVIN_CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174",
).split(",")
CREDENTIALS_PATH = os.getenv(
    "FIREBASE_CREDENTIALS",
    "alvin-661c5-firebase-adminsdk-fbsvc-6838c1e821.json",
)
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# Allow the Vite frontend (dev server) to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase. If credentials are missing we start in a degraded mode
# so the API can still boot for local frontend work — Firestore-backed
# endpoints then return a clear 503 instead of crashing the whole server.
db = None
if os.path.exists(CREDENTIALS_PATH):
    cred = credentials.Certificate(CREDENTIALS_PATH)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    print(
        f"WARNING: Firebase credentials '{CREDENTIALS_PATH}' not found. "
        "Firestore endpoints will return 503 until configured."
    )


def require_db():
    """Guard for Firestore-backed endpoints when running without credentials."""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Firestore unavailable: Firebase credentials not configured.",
        )
    return db

# --- PYDANTIC SCHEMAS (Data Validation) ---

class SystemStatus(BaseModel):
    emergency_mode: str  # Options: "none", "fire", "earthquake", "flood"

class EdgeStatusUpdate(BaseModel):
    status: str          # Options: "open", "blocked_by_fire", "blocked_by_flood"

    
class Node(BaseModel):
    id: str                 # e.g., "node_rm301"
    name: str               # e.g., "Room 301 / Study Oasis"
    floor: int = 1          # e.g., 3
    x: float = 0.0          # Coordinates for the 3D/2D map mapping
    y: float = 0.0
    type: str = "room"      # "room", "hallway", "stair", "exit"
    comfort_score: float = 100.0  # Default perfect comfort
    # Enriched space metadata + latest environment readings (optional).
    wing: Optional[str] = None
    room_no: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    airflow: Optional[float] = None
    noise: Optional[float] = None
    occupancy: int = 0
    capacity: int = 0

class Device(BaseModel):
    id: str                       # e.g., "esp32-01"
    room: str                     # human-readable room name
    sensors: List[str] = []       # e.g., ["Temp", "Humidity", "Airflow"]
    battery: int = 100            # percentage
    status: str = "online"        # "online" | "degraded" | "offline"
    last_seen: str = "just now"

class EvacuationCenter(BaseModel):
    id: str                       # e.g., "evac_sm_aura"
    name: str                     # e.g., "SM Aura Premier"
    partner: str = "Partner Evacuation Center"
    address: str = ""
    lat: float
    lng: float

class Edge(BaseModel):
    id: str          # e.g., "edge_rm301_to_hallway3"
    source: str      # id of starting node
    target: str      # id of destination node
    distance: float  # distance in meters
    is_covered: bool # true if it has a roof
    status: str = "open" # "open", "blocked_by_fire", "blocked_by_flood"

class SensorReading(BaseModel):
    sensor_id: str           # e.g., "esp32_001"
    node_id: str             # e.g., "node_001" - Crucial for linking data to the map!
    temperature: float       # Temperature in Celsius
    humidity: float          # Humidity percentage (0-100)
    air_quality: float       # Air Quality Index (AQI)
    airflow: Optional[float] = None   # m/s (optional)
    noise: Optional[float] = None     # dB (optional)
    occupancy: Optional[int] = None   # people currently in the space (optional)

    # Automatically stamps the exact time the reading hits the server if the ESP32 doesn't provide one
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "online", "project": "ALVIN Backend Engine", "firebase_connected": db is not None}

# Endpoint to add or update a structural Node
@app.post("/api/nodes", tags=["Map Infrastructure"])
def create_or_update_node(node: Node):
    require_db()
    try:
        db.collection("nodes").document(node.id).set(node.model_dump())
        return {"status": "success", "message": f"Node {node.id} successfully saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to add or update a walkable Pathway (Edge)
@app.post("/api/edges", tags=["Map Infrastructure"])
def create_or_update_edge(edge: Edge):
    require_db()
    try:
        source_doc = db.collection("nodes").document(edge.source).get()
        target_doc = db.collection("nodes").document(edge.target).get()
        
        if not source_doc.exists or not target_doc.exists:
            raise HTTPException(status_code=400, detail="Source or Target node does not exist in the database.")

        db.collection("edges").document(edge.id).set(edge.model_dump())
        return {"status": "success", "message": f"Edge {edge.id} successfully saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW: NAVIGATION ENGINE ---

@app.get("/api/navigate", tags=["Navigation Engine"])
def navigate(
    start_node: str = Query(..., description="ID of the starting node"),
    end_node: str = Query(..., description="ID of the destination node"),
    preference: str = Query("shortest", description="Options: 'shortest', 'covered', 'comfortable'")
):
    """
    ALVIN Dynamic Pathfinding Engine.
    Computes real-time routing paths while adjusting to structural blocks and comfort preferences.
    """
    require_db()
    try:
        G = nx.Graph()
        
        # Fetch nodes
        nodes_ref = db.collection("nodes").stream()
        nodes_dict = {}
        for doc in nodes_ref:
            node_data = doc.to_dict()
            nodes_dict[node_data["id"]] = node_data
            G.add_node(node_data["id"], **node_data)
            
        # Fetch edges
        edges_ref = db.collection("edges").stream()
        for doc in edges_ref:
            edge_data = doc.to_dict()
            base_weight = edge_data["distance"]
            
            # Dynamic weights
            if edge_data.get("status", "open") != "open":
                base_weight = float('inf') 
            elif preference == "covered" and not edge_data.get("is_covered", True):
                base_weight += 100.0 
            elif preference == "comfortable":
                target_node_id = edge_data["target"]
                target_node_info = nodes_dict.get(target_node_id, {})
                comfort = target_node_info.get("comfort_score", 100.0)
                base_weight += (100.0 - comfort) * 2.0

            G.add_edge(edge_data["source"], edge_data["target"], weight=base_weight, **edge_data)
            
        # Run Shortest Path
        path = nx.shortest_path(G, source=start_node, target=end_node, weight="weight")
        
        # Format output
        formatted_route = []
        for node_id in path:
            node_info = nodes_dict.get(node_id, {})
            formatted_route.append({
                "id": node_id,
                "name": node_info.get("name", node_id),
                "floor": node_info.get("floor"),
                "x": node_info.get("x"),
                "y": node_info.get("y"),
                "comfort_score": node_info.get("comfort_score", 100.0)
            })
            
        return {
            "status": "success",
            "navigation_preference": preference,
            "total_steps": len(path),
            "route_sequence": path,
            "detailed_path": formatted_route
        }

    except nx.NodeNotFound as e:
        raise HTTPException(status_code=404, detail=f"Location error: {str(e)}")
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=400, detail="Navigation Impossible: No safe pathways exist.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Engine Error: {str(e)}")


# --- NEW: EMERGENCY MANAGEMENT ---

@app.post("/api/emergency/global", tags=["Emergency Management"])
def update_global_emergency(status: SystemStatus):
    """
    Updates the global system status (e.g., triggering a campus-wide fire alarm).
    """
    require_db()
    try:
        db.collection("system_status").document("current_state").set(status.model_dump())
        return {
            "status": "success", 
            "message": f"🚨 Global emergency mode set to: {status.emergency_mode.upper()}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/api/emergency/edges/{edge_id}", tags=["Emergency Management"])
def update_path_status(edge_id: str, update: EdgeStatusUpdate):
    """
    Instantly blocks or opens a specific pathway. 
    ALVIN's navigation engine will automatically route around blocked paths on the next request.
    """
    require_db()
    try:
        edge_ref = db.collection("edges").document(edge_id)
        
        # Check if the edge exists before updating
        if not edge_ref.get().exists:
            raise HTTPException(status_code=404, detail=f"Edge '{edge_id}' not found.")
        
        # Update just the status field of the specific edge
        edge_ref.update({"status": update.status})
        
        return {
            "status": "success", 
            "message": f"🚧 Pathway '{edge_id}' status dynamically updated to: {update.status}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# --- NEW: SENSOR DATA & INTELLIGENCE ---
def calculate_comfort_score(temp: float, humidity: float, aqi: float) -> float:
    """
    Core Logic: Calculates an Environmental Comfort Score (0-100) 
    based on absolute deviations from ideal indoor conditions.
    """
    ideal_temp = 24.0
    ideal_humidity = 50.0
    
    # Weights: 3 pts lost per degree, 0.5 pts per % humidity, 0.2 pts per AQI over 50
    temp_penalty = abs(temp - ideal_temp) * 3.0
    humidity_penalty = abs(humidity - ideal_humidity) * 0.5
    aqi_penalty = max(0, aqi - 50) * 0.2
    
    # Calculate final score and clamp it strictly between 0 and 100
    raw_score = 100.0 - temp_penalty - humidity_penalty - aqi_penalty
    return max(0.0, min(100.0, round(raw_score, 1)))


def get_manila_weather():
    """
    Utility: fetch real-time weather for Manila from OpenWeatherMap.
    Returns temperature, heat index, humidity, wind, and rain intensity.
    """
    API_KEY = OPENWEATHER_API_KEY
    CITY = "Manila,PH"
    url = f"http://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()

        condition = data["weather"][0]["main"]  # "Rain", "Clouds", "Clear", ...
        is_raining = condition.lower() in ("rain", "drizzle", "thunderstorm")
        wind_ms = data.get("wind", {}).get("speed", 0.0)
        rain_mm = data.get("rain", {}).get("1h", 0.0)

        return {
            "status": "success",
            "location": "Manila City",
            "temperature_c": data["main"]["temp"],
            "heat_index_c": data["main"]["feels_like"],
            "humidity": data["main"].get("humidity"),
            "wind_kph": round(wind_ms * 3.6, 1),
            "rain_mm_h": rain_mm,
            "condition": condition,
            "is_raining": is_raining,
        }
    except requests.exceptions.RequestException:
        # Fallback if the API key is missing or the network is down.
        return {
            "status": "error",
            "message": "Weather API offline or missing key. Returning fallback data.",
            "location": "Manila City",
            "temperature_c": 31.0,
            "heat_index_c": 34.0,
            "humidity": 70,
            "wind_kph": 10.0,
            "rain_mm_h": 0.0,
            "condition": "Unknown",
            "is_raining": False,
        }


@app.get("/api/weather/current", tags=["Sensor Data & Intelligence"])
def fetch_current_weather():
    """Dashboard endpoint: current outdoor conditions for Manila."""
    return get_manila_weather()


@app.post("/api/sensors/ingest", tags=["Sensor Data & Intelligence"])
def ingest_sensor_data(reading: SensorReading):
    """
    Receives live environmental data from ESP32 microcontrollers.
    Calculates the comfort score and triggers an automatic map update.
    """
    require_db()
    try:
        data = reading.model_dump()
        unique_doc_id = f"{reading.sensor_id}_{int(reading.timestamp.timestamp())}"
        
        # 1. Save the raw time-series data
        db.collection("sensor_data").document(unique_doc_id).set(data)
        
        # 2. CORE LOGIC: Calculate the new comfort score
        new_comfort_score = calculate_comfort_score(
            reading.temperature, 
            reading.humidity, 
            reading.air_quality
        )
        
        # 3. DYNAMIC MAP UPDATE: Update the physical node on the map.
        # merge=True so we never overwrite the node's coordinates/name.
        node_update = {
            "comfort_score": new_comfort_score,
            "temperature": reading.temperature,
            "humidity": reading.humidity,
        }
        if reading.airflow is not None:
            node_update["airflow"] = reading.airflow
        if reading.noise is not None:
            node_update["noise"] = reading.noise
        if reading.occupancy is not None:
            node_update["occupancy"] = reading.occupancy
        db.collection("nodes").document(reading.node_id).set(node_update, merge=True)
        
        return {
            "status": "success",
            "message": f"🌡️ Data processed. Node {reading.node_id} comfort score updated to {new_comfort_score}/100",
            "recorded_at": reading.timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during ingestion: {str(e)}")
    
@app.get("/api/dashboard/live-sensors", tags=["Sensor Data & Intelligence"])
def get_live_sensor_readings():
    """
    Dashboard Endpoint: Retrieves the most recent environmental readings 
    for all active nodes to display live metrics on the UI.
    """
    require_db()
    try:
        # Fetch all nodes from Firestore to see their current states
        nodes_ref = db.collection("nodes").stream()
        live_metrics = []
        
        for doc in nodes_ref:
            node_data = doc.to_dict()
            live_metrics.append({
                "node_id": node_data.get("id"),
                "name": node_data.get("name"),
                "comfort_score": node_data.get("comfort_score", 100.0),
                "type": node_data.get("type")
            })
            
        return {
            "status": "success",
            "total_monitored_nodes": len(live_metrics),
            "nodes": live_metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live stats: {str(e)}")


@app.get("/api/dashboard/stats", tags=["Sensor Data & Intelligence"])
def get_dashboard_summary_stats():
    """
    Dashboard Endpoint: Calculates overall infrastructure intelligence statistics 
    (e.g., system-wide average comfort level, alert statuses).
    """
    require_db()
    try:
        scores, temps, hums = [], [], []
        total_occ = total_cap = 0
        low_comfort_alerts = []

        for doc in db.collection("nodes").stream():
            node = doc.to_dict()
            if node.get("type") not in (None, "room"):
                continue  # only score inhabitable rooms
            score = node.get("comfort_score", 100.0)
            scores.append(score)
            if node.get("temperature") is not None:
                temps.append(node["temperature"])
            if node.get("humidity") is not None:
                hums.append(node["humidity"])
            total_occ += node.get("occupancy", 0) or 0
            total_cap += node.get("capacity", 0) or 0

            if score < 70.0:
                low_comfort_alerts.append({
                    "node_id": node.get("id"),
                    "name": node.get("name"),
                    "current_score": score,
                })

        # Device health
        devices = [d.to_dict() for d in db.collection("devices").stream()]
        active_devices = sum(1 for d in devices if d.get("status") == "online")

        def _avg(xs, digits=1):
            return round(sum(xs) / len(xs), digits) if xs else None

        return {
            "status": "success",
            "spaces_monitored": len(scores),
            "system_wide_average_comfort": _avg(scores),
            "avg_temperature_c": _avg(temps),
            "avg_humidity": _avg(hums, 0),
            "total_occupancy": total_occ,
            "total_capacity": total_cap,
            "active_devices": active_devices,
            "total_devices": len(devices),
            "total_alerts": len(low_comfort_alerts),
            "alert_areas": low_comfort_alerts,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile dashboard metrics: {str(e)}")


# --- NEW: SPACES / ROOMS ---

def _room_payload(node: dict) -> dict:
    return {
        "id": node.get("id"),
        "name": node.get("name"),
        "wing": node.get("wing"),
        "room_no": node.get("room_no"),
        "floor": node.get("floor"),
        "comfort_score": node.get("comfort_score", 100.0),
        "temperature": node.get("temperature"),
        "humidity": node.get("humidity"),
        "airflow": node.get("airflow"),
        "noise": node.get("noise"),
        "occupancy": node.get("occupancy", 0),
        "capacity": node.get("capacity", 0),
    }


@app.get("/api/rooms", tags=["Spaces"])
def get_rooms():
    """Full detail for every inhabitable room (for the Environmental / room panels)."""
    require_db()
    try:
        rooms = [
            _room_payload(doc.to_dict())
            for doc in db.collection("nodes").stream()
            if doc.to_dict().get("type", "room") == "room"
        ]
        return {"status": "success", "total": len(rooms), "rooms": rooms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rooms: {str(e)}")


@app.get("/api/rooms/{node_id}", tags=["Spaces"])
def get_room(node_id: str):
    """Full detail for a single room."""
    require_db()
    try:
        doc = db.collection("nodes").document(node_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Room '{node_id}' not found.")
        return {"status": "success", "room": _room_payload(doc.to_dict())}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch room: {str(e)}")


@app.get("/api/recommendations", tags=["Spaces"])
def get_recommendations():
    """
    Rank rooms by comfort and map each activity to the best-suited space.
    Powers the "Recommended for you" / recommendations views.
    """
    require_db()
    try:
        rooms = [
            _room_payload(doc.to_dict())
            for doc in db.collection("nodes").stream()
            if doc.to_dict().get("type", "room") == "room"
        ]
        ranked = sorted(rooms, key=lambda r: r["comfort_score"], reverse=True)
        activities = [
            ("Best Place to Study", "Quiet, comfortable focus space"),
            ("Best Waiting Area", "Comfortable place to wait"),
            ("Best Rest Area", "Relax and recharge"),
            ("Best Meeting Spot", "Good for group work"),
        ]
        recommendations = []
        for i, (activity, reason) in enumerate(activities):
            if i < len(ranked):
                room = ranked[i]
                recommendations.append({
                    "activity": activity,
                    "reason": reason,
                    "node_id": room["id"],
                    "name": room["name"],
                    "comfort_score": room["comfort_score"],
                })
        return {
            "status": "success",
            "recommendations": recommendations,
            "ranked": ranked,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build recommendations: {str(e)}")


# --- NEW: DEVICES (IoT sensor nodes) ---

@app.post("/api/devices", tags=["Devices"])
def create_or_update_device(device: Device):
    """Register or update an ESP32 sensor node."""
    require_db()
    try:
        db.collection("devices").document(device.id).set(device.model_dump())
        return {"status": "success", "message": f"Device {device.id} saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/devices", tags=["Devices"])
def list_devices():
    """List all IoT devices with a health summary."""
    require_db()
    try:
        devices = [d.to_dict() for d in db.collection("devices").stream()]
        active = sum(1 for d in devices if d.get("status") == "online")
        return {
            "status": "success",
            "total": len(devices),
            "active": active,
            "devices": devices,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch devices: {str(e)}")


# --- NEW: EMERGENCY STATUS + EVACUATION CENTERS ---

@app.get("/api/emergency/status", tags=["Emergency Management"])
def get_emergency_status():
    """Current global emergency state and default safe-route guidance."""
    require_db()
    try:
        doc = db.collection("system_status").document("current_state").get()
        state = doc.to_dict() if doc.exists else {}
        mode = state.get("emergency_mode", "none")
        return {
            "status": "success",
            "active": mode != "none",
            "emergency_mode": mode,
            "safe_route": state.get("safe_route", "Hallway A"),
            "nearest_exit": state.get("nearest_exit", "Front Lobby"),
            "assembly_area": state.get("assembly_area", "Covered court"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch emergency status: {str(e)}")


@app.post("/api/evacuation-centers", tags=["Emergency Management"])
def create_or_update_evac_center(center: EvacuationCenter):
    """Register or update a partner evacuation center."""
    require_db()
    try:
        db.collection("evacuation_centers").document(center.id).set(center.model_dump())
        return {"status": "success", "message": f"Evacuation center {center.id} saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/evacuation-centers", tags=["Emergency Management"])
def list_evac_centers():
    """List all partner evacuation centers."""
    require_db()
    try:
        centers = [c.to_dict() for c in db.collection("evacuation_centers").stream()]
        return {"status": "success", "total": len(centers), "centers": centers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch evacuation centers: {str(e)}")


def _haversine_m(lat1, lng1, lat2, lng2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


@app.get("/api/evacuation-centers/nearest", tags=["Emergency Management"])
def nearest_evac_center(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
):
    """Return the closest partner evacuation center to the given location."""
    require_db()
    try:
        centers = [c.to_dict() for c in db.collection("evacuation_centers").stream()]
        if not centers:
            raise HTTPException(status_code=404, detail="No evacuation centers configured.")
        for c in centers:
            c["distance_m"] = round(_haversine_m(lat, lng, c["lat"], c["lng"]), 1)
        nearest = min(centers, key=lambda c: c["distance_m"])
        return {"status": "success", "nearest": nearest, "centers": centers}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find nearest center: {str(e)}")