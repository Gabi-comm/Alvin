import { useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { BUILDING_CENTER, COMFORT_BANDS } from '../data/mockData'
import './MapView.css'

const DEFAULT_ZOOM = 17

// Custom zoom / reset controls that need access to the map instance.
function MapControls() {
  const map = useMap()
  return (
    <div className="mapview__controls">
      <button onClick={() => map.zoomIn()} aria-label="Zoom in">+</button>
      <button onClick={() => map.zoomOut()} aria-label="Zoom out">−</button>
      <button
        className="mapview__reset"
        onClick={() => map.setView(BUILDING_CENTER, DEFAULT_ZOOM)}
      >
        Reset
      </button>
    </div>
  )
}

export default function MapView() {
  const [time, setTime] = useState(8) // hours offset from 6:00 AM (0-16)
  const startHour = 6
  const label = (h) => {
    const hour24 = startHour + h
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = ((hour24 + 11) % 12) + 1
    return `${hour12}:00 ${period}`
  }

  return (
    <section className="mapview">
      <MapContainer
        className="mapview__map"
        center={BUILDING_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapControls />
      </MapContainer>

      <div className="mapview__legend">
        <span className="mapview__legend-title">COMFORT LEVEL</span>
        {COMFORT_BANDS.map((band) => (
          <div key={band.label} className="mapview__legend-row">
            <span className="mapview__legend-dot" style={{ background: band.color }} />
            <span>{band.label}</span>
          </div>
        ))}
      </div>

      <div className="mapview__timeslider">
        <span className="mapview__time-icon" aria-hidden="true">☀️</span>
        <span className="mapview__time-label">{label(0)}</span>
        <input
          type="range"
          min="0"
          max="16"
          value={time}
          onChange={(e) => setTime(Number(e.target.value))}
          aria-label="Time of day"
        />
        <span className="mapview__time-label">{label(16)}</span>
        <span className="mapview__time-icon" aria-hidden="true">🌙</span>
        <span className="mapview__time-current">{label(time)}</span>
      </div>
    </section>
  )
}
