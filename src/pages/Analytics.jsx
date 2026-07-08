import { useEffect, useRef, useState } from 'react'
import { comfortColor, airflowLabel } from '../data/mockData'
import { useRooms, useDevices } from '../hooks/useLiveData'
import LineChart from '../components/LineChart'
import './pages.css'

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
const MAX_POINTS = 12

export default function Analytics() {
  const { rooms, live: roomsLive } = useRooms()
  const { devices, live: devicesLive } = useDevices()

  // Build a live temperature/humidity stream from the monitored room by
  // snapshotting the latest reading every few seconds.
  const room = rooms[0]
  const roomRef = useRef(room)
  roomRef.current = room
  const [history, setHistory] = useState([])
  useEffect(() => {
    const snap = () => {
      const r = roomRef.current
      if (!r || r.temp == null) return
      const label = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setHistory((h) => [...h.slice(-(MAX_POINTS - 1)), { hour: label, temp: r.temp, humidity: r.humidity }])
    }
    snap()
    const id = setInterval(snap, 5000)
    return () => clearInterval(id)
  }, [])

  const avgComfort = Math.round(avg(rooms.map((r) => r.score)))
  const alerts = rooms.filter((r) => r.score < 70).length
  const activeDevices = devices.filter((d) => d.status === 'online').length
  const totalCap = rooms.reduce((a, r) => a + r.capacity, 0)
  const totalOcc = rooms.reduce((a, r) => a + r.occupancy, 0)
  const occupancy = totalCap ? Math.round((totalOcc / totalCap) * 100) : 0

  const stats = [
    { label: 'Avg. Comfort', value: `${avgComfort}%`, tone: comfortColor(avgComfort) },
    { label: 'Comfort Alerts', value: alerts, tone: alerts ? 'var(--alvin-warn)' : 'var(--alvin-accent)' },
    { label: 'Active Devices', value: `${activeDevices}/${devices.length}`, tone: 'var(--alvin-accent-2)' },
    { label: 'Occupancy', value: `${occupancy}%`, tone: 'var(--alvin-accent-2)' },
  ]

  const ranked = [...rooms].sort((a, b) => b.score - a.score)
  const live = roomsLive || devicesLive

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">
          Analytics{live && <span className="live-badge">● LIVE</span>}
        </h1>
        <p className="page__subtitle">
          Environmental readings, trends, and device health across Seda BGC.
        </p>
      </div>

      {/* KPIs */}
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__dot" style={{ background: s.tone }} />
            <span className="stat-card__value">{s.value}</span>
            <span className="stat-card__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Live trends */}
      <div className="grid grid--2" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel__head">
            <span className="panel__label">Temperature</span>
            <span className="panel__hint">°C · live stream</span>
          </div>
          {history.length > 1 ? (
            <LineChart data={history} valueKey="temp" unit="°" color="var(--alvin-warn)" />
          ) : (
            <div className="chart-empty">Collecting live readings…</div>
          )}
        </div>
        <div className="panel">
          <div className="panel__head">
            <span className="panel__label">Humidity</span>
            <span className="panel__hint">% · live stream</span>
          </div>
          {history.length > 1 ? (
            <LineChart data={history} valueKey="humidity" unit="%" color="var(--alvin-accent-2)" />
          ) : (
            <div className="chart-empty">Collecting live readings…</div>
          )}
        </div>
      </div>

      {/* Spaces */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel__head">
          <span className="panel__label">Spaces</span>
          <span className="panel__hint">{rooms.length} monitored</span>
        </div>
        <table className="table table--flush">
          <thead>
            <tr>
              <th>Space</th><th style={{ width: '34%' }}>Comfort</th>
              <th>Temp</th><th>Humidity</th><th>Airflow</th><th>Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.id}>
                <td className="cell-strong">{r.name}</td>
                <td>
                  <div className="cell-comfort">
                    <span className="cell-bar">
                      <span className="cell-bar__fill" style={{ width: `${r.score}%`, background: comfortColor(r.score) }} />
                    </span>
                    <span className="cell-comfort__val" style={{ color: comfortColor(r.score) }}>{r.score}%</span>
                  </div>
                </td>
                <td>{r.temp ?? '—'}°C</td>
                <td>{r.humidity ?? '—'}%</td>
                <td>{r.airflow != null ? airflowLabel(r.airflow) : '—'}</td>
                <td>{r.occupancy}/{r.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Devices */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel__head">
          <span className="panel__label">Devices</span>
          <span className="panel__hint">{activeDevices}/{devices.length} online</span>
        </div>
        <table className="table table--flush">
          <thead>
            <tr>
              <th>Device</th><th>Location</th><th>Sensors</th><th>Battery</th><th>Last Seen</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td className="cell-mono">{d.id}</td>
                <td>{d.room}</td>
                <td className="cell-dim">{d.sensors.join(', ')}</td>
                <td>{d.battery}%</td>
                <td className="cell-dim">{d.lastSeen}</td>
                <td>
                  <span className={`status-tag status-tag--${d.status}`}>● {d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
