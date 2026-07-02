"""
Seed the ALVIN graph with a sample building so the live endpoints
(/api/navigate, /api/rooms, /api/devices, /api/dashboard/*, evacuation
centers) return real data.

Requires the backend running WITH Firebase credentials configured:

    uvicorn main:app --reload --port 8000   # in one terminal
    python seed.py                          # in another

Node names mirror the frontend rooms so the comfort overlay matches by name.
Set ALVIN_API_URL to target a non-default backend.
"""
import os
import sys
import requests

API = os.getenv("ALVIN_API_URL", "http://localhost:8000")

# Rich room nodes: id, name, wing, room_no, x, y, comfort, temp, humidity,
# airflow, noise, occupancy, capacity
ROOMS = [
    ("node_entrance", "Entrance Lobby", "Main Building", "Ground", 0, 0, 50, 29.7, 68, 0.8, 58, 20, 50),
    ("node_hallway", "Hallway", "Main Building", "Corridor A", 0, 10, 58, 28.6, 66, 0.7, 55, 9, 40),
    ("node_library", "Library", "Library Wing", "Room 101", -10, 20, 95, 24.3, 58, 0.6, 32, 23, 60),
    ("node_study1", "Study Area 1", "Library Wing", "Room 102", -20, 20, 92, 24.1, 54, 0.5, 35, 12, 30),
    ("node_admin", "Admin Office", "Admin Wing", "Room 010", 10, 20, 70, 26.9, 58, 0.3, 45, 6, 15),
    ("node_lecture1", "Lecture Room 1", "Academic Wing", "Room 201", 20, 25, 75, 25.8, 60, 0.4, 40, 18, 40),
    ("node_lounge", "Lounge", "Student Wing", "Room 120", 15, 30, 82, 25.2, 55, 0.5, 48, 14, 25),
    ("node_cafeteria", "Cafeteria", "Student Wing", "Room 130", -5, 30, 64, 27.8, 63, 0.4, 62, 31, 80),
    ("node_storage", "Storage", "Service Wing", "Room 005", -20, 5, 40, 31.1, 70, 0.2, 30, 1, 5),
]

# Non-room structural nodes (exits / assembly)
STRUCT_NODES = [
    ("node_exit", "Main Exit", "exit", 0, -10, 100),
    ("node_assembly", "Assembly Court", "exit", 0, -25, 100),
]

# id, source, target, distance (m), is_covered
EDGES = [
    ("e_entrance_hallway", "node_entrance", "node_hallway", 10, True),
    ("e_hallway_library", "node_hallway", "node_library", 14, True),
    ("e_hallway_study1", "node_hallway", "node_study1", 22, True),
    ("e_hallway_admin", "node_hallway", "node_admin", 14, True),
    ("e_hallway_lecture1", "node_hallway", "node_lecture1", 24, True),
    ("e_hallway_lounge", "node_hallway", "node_lounge", 25, True),
    ("e_hallway_cafeteria", "node_hallway", "node_cafeteria", 21, True),
    ("e_entrance_storage", "node_entrance", "node_storage", 20, False),
    ("e_entrance_exit", "node_entrance", "node_exit", 10, False),
    ("e_exit_assembly", "node_exit", "node_assembly", 15, False),
]

# id, room, sensors, battery, status, last_seen
DEVICES = [
    ("esp32-01", "Library", ["Temp", "Humidity", "Airflow"], 92, "online", "10s ago"),
    ("esp32-02", "Study Area 1", ["Temp", "Humidity", "Airflow"], 88, "online", "8s ago"),
    ("esp32-03", "Lecture Room 1", ["Temp", "Humidity"], 74, "online", "12s ago"),
    ("esp32-04", "Cafeteria", ["Temp", "Humidity", "Airflow"], 61, "online", "5s ago"),
    ("esp32-05", "Entrance Lobby", ["Temp", "Humidity", "Airflow"], 45, "degraded", "2m ago"),
    ("esp32-06", "Storage", ["Temp", "Humidity"], 0, "offline", "3h ago"),
]

# id, name, partner, address, lat, lng
EVAC_CENTERS = [
    ("evac_sm_aura", "SM Aura Premier", "Partner Evacuation Center", "McKinley Pkwy, BGC, Taguig", 14.5472, 121.0563),
    ("evac_uptown", "Uptown Mall BGC", "Partner Evacuation Center", "36th St, BGC, Taguig", 14.5555, 121.0537),
    ("evac_track30", "Track 30th Open Field", "Assembly Area", "7th Ave, BGC, Taguig", 14.5525, 121.0490),
]


def post(path, payload):
    r = requests.post(f"{API}{path}", json=payload, timeout=10)
    r.raise_for_status()
    return r.json()


def main():
    try:
        health = requests.get(f"{API}/", timeout=5).json()
    except requests.exceptions.RequestException:
        sys.exit(f"Backend not reachable at {API}. Start it first.")
    if not health.get("firebase_connected"):
        sys.exit("Backend is up but Firebase is not connected — configure FIREBASE_CREDENTIALS.")

    for (nid, name, wing, room_no, x, y, comfort, temp, hum, air, noise, occ, cap) in ROOMS:
        post("/api/nodes", {
            "id": nid, "name": name, "floor": 1, "x": x, "y": y, "type": "room",
            "comfort_score": comfort, "wing": wing, "room_no": room_no,
            "temperature": temp, "humidity": hum, "airflow": air, "noise": noise,
            "occupancy": occ, "capacity": cap,
        })
        print(f"  room    {nid:16} {name} ({comfort}%)")

    for (nid, name, ntype, x, y, comfort) in STRUCT_NODES:
        post("/api/nodes", {
            "id": nid, "name": name, "floor": 1, "x": x, "y": y,
            "type": ntype, "comfort_score": comfort,
        })
        print(f"  node    {nid:16} {name}")

    for (eid, src, tgt, dist, covered) in EDGES:
        post("/api/edges", {
            "id": eid, "source": src, "target": tgt,
            "distance": dist, "is_covered": covered, "status": "open",
        })
        print(f"  edge    {eid}")

    for (did, room, sensors, battery, status, last_seen) in DEVICES:
        post("/api/devices", {
            "id": did, "room": room, "sensors": sensors,
            "battery": battery, "status": status, "last_seen": last_seen,
        })
        print(f"  device  {did:16} {room} ({status})")

    for (cid, name, partner, address, lat, lng) in EVAC_CENTERS:
        post("/api/evacuation-centers", {
            "id": cid, "name": name, "partner": partner,
            "address": address, "lat": lat, "lng": lng,
        })
        print(f"  evac    {cid:16} {name}")

    print(
        f"\nSeeded {len(ROOMS)} rooms, {len(STRUCT_NODES)} structural nodes, "
        f"{len(EDGES)} edges, {len(DEVICES)} devices, {len(EVAC_CENTERS)} evac centers."
    )


if __name__ == "__main__":
    main()
