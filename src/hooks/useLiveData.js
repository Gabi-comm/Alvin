import { useEffect, useState } from 'react'
import { ROOMS, DEVICES } from '../data/mockData'
import { fetchRooms, fetchDevices } from '../services/api'

// How often the app polls the backend for fresh sensor data (ms).
const POLL_MS = 5000

// Map a backend room payload to the shape the UI components expect.
function mapRoom(r) {
  return {
    id: r.id,
    name: r.name,
    wing: r.wing,
    room: r.room_no,
    score: Math.round(r.comfort_score ?? 0),
    temp: r.temperature,
    humidity: r.humidity,
    airflow: r.airflow,
    noise: r.noise,
    occupancy: r.occupancy ?? 0,
    capacity: r.capacity ?? 0,
  }
}

// Live rooms from /api/rooms, auto-polling so DHT22 readings update on their
// own. Falls back to mock data when the backend is offline.
export function useRooms() {
  const [rooms, setRooms] = useState(ROOMS)
  const [live, setLive] = useState(false)
  useEffect(() => {
    let active = true
    const load = () =>
      fetchRooms().then((d) => {
        if (active && d && d.status === 'success' && d.rooms?.length) {
          setRooms(d.rooms.map(mapRoom))
          setLive(true)
        }
      })
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])
  return { rooms, live }
}

// Live devices from /api/devices, auto-polling. Falls back to mock when offline.
export function useDevices() {
  const [devices, setDevices] = useState(DEVICES)
  const [live, setLive] = useState(false)
  useEffect(() => {
    let active = true
    const load = () =>
      fetchDevices().then((d) => {
        if (active && d && d.status === 'success' && d.devices?.length) {
          setDevices(d.devices.map((x) => ({ ...x, lastSeen: x.last_seen ?? x.lastSeen })))
          setLive(true)
        }
      })
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])
  return { devices, live }
}
