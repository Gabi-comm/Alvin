import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import './MapView.css'

// Default center — placeholder campus location (Manila). Swap for the
// target building's coordinates once the digital twin is georeferenced.
const DEFAULT_CENTER = [14.5995, 120.9842]
const DEFAULT_ZOOM = 17

const LEGEND = [
  { label: 'Cooling Zone', color: '#38bdf8' },
  { label: 'Comfortable', color: '#21d0a3' },
  { label: 'Heat Risk', color: '#fbbf24' },
  { label: 'Unsafe / Flooded', color: '#f5555d' },
]

export default function MapView() {
  return (
    <section className="mapview">
      <MapContainer
        className="mapview__map"
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
      </MapContainer>

      <div className="mapview__legend">
        <span className="mapview__legend-title">Live Heat &amp; Rain Map</span>
        {LEGEND.map((item) => (
          <div key={item.label} className="mapview__legend-row">
            <span
              className="mapview__legend-swatch"
              style={{ background: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
