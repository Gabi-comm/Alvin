import { ROOMS, comfortColor } from '../data/mockData'
import './pages.css'

export default function ThreeDTwin() {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page__header">
        <h1 className="page__title">3D Digital Twin</h1>
        <p className="page__subtitle">
          Interactive 3D replica of Main Building — Ground Floor. Click a room to inspect comfort and devices.
        </p>
      </div>

      <div className="placeholder-canvas">
        <div>
          <div className="placeholder-canvas__icon">🏢</div>
          <div>3D building model renders here</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            (Three.js / model viewer integration pending)
          </div>
        </div>
      </div>

      <div className="grid grid--rooms" style={{ marginTop: 16 }}>
        {ROOMS.map((room) => (
          <div key={room.id} className="info-card">
            <div className="info-card__head">
              <span className="info-card__name">{room.name}</span>
              <span className="score-pill" style={{ background: comfortColor(room.score) }}>
                {room.score}%
              </span>
            </div>
            <div className="metric-row"><span>Temperature</span><span>{room.temp}°C</span></div>
            <div className="metric-row"><span>Occupancy</span><span>{room.occupancy} people</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
