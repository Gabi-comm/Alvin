import { COMFORT_BANDS, comfortColor, airflowLabel, noiseLabel } from '../data/mockData'
import './RoomPanel.css'

function bandName(score) {
  const band = COMFORT_BANDS.find((b) => score >= b.min)
  return band ? band.label.split(' (')[0] : 'Unknown'
}

// Circular comfort gauge (SVG progress ring).
function ComfortGauge({ score }) {
  const r = 46
  const c = 2 * Math.PI * r
  const color = comfortColor(score)
  return (
    <div className="gauge">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--alvin-surface-2)" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="gauge__center">
        <span className="gauge__value">{score}<span className="gauge__unit">%</span></span>
        <span className="gauge__caption">Comfort Score</span>
        <span className="gauge__band" style={{ color }}>{bandName(score)}</span>
      </div>
    </div>
  )
}

export default function RoomPanel({ room, onClose }) {
  if (!room) return null

  const devices = [
    { name: `ALVIN Sensor ${(room.room || '').replace(/\D/g, '') || '101'}`, status: 'online' },
    { name: 'ALVIN Airflow Node', status: room.airflow > 0 ? 'online' : 'offline' },
    { name: 'ALVIN Occupancy Cam', status: room.score >= 40 ? 'online' : 'offline' },
  ]
  const active = devices.filter((d) => d.status === 'online').length

  const metrics = [
    ['Temperature', `${room.temp}°C`],
    ['Humidity', `${room.humidity}%`],
    ['Airflow', airflowLabel(room.airflow)],
    ['Noise Level', noiseLabel(room.noise)],
    ['Occupancy', `${room.occupancy} / ${room.capacity}`],
  ]

  return (
    <aside className="room-panel">
      <div className="room-panel__head">
        <div>
          <span className="room-panel__wing">{room.wing?.toUpperCase()}</span>
          <h3 className="room-panel__name">{room.name}</h3>
          <span className="room-panel__room">{room.room}</span>
        </div>
        {onClose && (
          <button className="room-panel__close" onClick={onClose} aria-label="Close">×</button>
        )}
      </div>

      <ComfortGauge score={room.score} />

      <div className="room-panel__metrics">
        {metrics.map(([label, value]) => (
          <div key={label} className="room-panel__metric">
            <span>{label}</span>
            <span className="room-panel__metric-value">{value}</span>
          </div>
        ))}
      </div>

      <div className="room-panel__devices">
        <div className="room-panel__devices-head">
          <span>IoT Devices</span>
          <span className="room-panel__active">{active} Active</span>
        </div>
        {devices.map((d) => (
          <div key={d.name} className="room-panel__device">
            <span>{d.name}</span>
            <span className={`room-panel__status room-panel__status--${d.status}`}>
              {d.status === 'online' ? 'Online' : 'Offline'} ●
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
