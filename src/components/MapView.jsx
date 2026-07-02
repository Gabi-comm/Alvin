import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { COMFORT_BANDS } from '../data/mockData'
import './MapView.css'

// Bonifacio Global City, Taguig. MapLibre uses [lng, lat].
const BGC_CENTER = [121.0489, 14.5509]
const BGC_BOUNDS = [
  [121.034, 14.538], // south-west
  [121.063, 14.563], // north-east
]
const INITIAL_VIEW = { center: BGC_CENTER, zoom: 15.2, pitch: 58, bearing: -20 }

// Free dark vector basemap (OpenMapTiles schema → has a `building` layer).
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Add 3D building extrusions using the basemap's vector building layer.
function addBuildings(map) {
  const style = map.getStyle()
  const vectorSourceId = Object.keys(style.sources).find(
    (id) => style.sources[id].type === 'vector',
  )
  if (!vectorSourceId || map.getLayer('alvin-3d-buildings')) return

  // Insert below the first label (symbol) layer so street names stay on top.
  const firstSymbol = style.layers.find((l) => l.type === 'symbol')?.id

  map.addLayer(
    {
      id: 'alvin-3d-buildings',
      source: vectorSourceId,
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': '#2a3a55',
        'fill-extrusion-opacity': 0.85,
        'fill-extrusion-height': [
          'coalesce',
          ['get', 'render_height'],
          ['get', 'height'],
          12,
        ],
        'fill-extrusion-base': [
          'coalesce',
          ['get', 'render_min_height'],
          ['get', 'min_height'],
          0,
        ],
      },
    },
    firstSymbol,
  )
}

export default function MapView() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [time, setTime] = useState(8) // hours from 6:00 AM (0-16)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      ...INITIAL_VIEW,
      maxBounds: BGC_BOUNDS, // lock panning to BGC
      minZoom: 13.5,
      maxZoom: 19,
      maxPitch: 75,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.on('load', () => addBuildings(map))
    mapRef.current = map
    return () => map.remove()
  }, [])

  const resetView = () => mapRef.current?.easeTo({ ...INITIAL_VIEW, duration: 800 })

  const startHour = 6
  const label = (h) => {
    const hour24 = startHour + h
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = ((hour24 + 11) % 12) + 1
    return `${hour12}:00 ${period}`
  }

  return (
    <section className="mapview">
      <div ref={containerRef} className="mapview__map" />

      <div className="mapview__legend">
        <span className="mapview__legend-title">COMFORT LEVEL</span>
        {COMFORT_BANDS.map((band) => (
          <div key={band.label} className="mapview__legend-row">
            <span className="mapview__legend-dot" style={{ background: band.color }} />
            <span>{band.label}</span>
          </div>
        ))}
        <span className="mapview__legend-loc">📍 BGC, Taguig</span>
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

      <button className="mapview__reset" onClick={resetView}>
        Reset view
      </button>
    </section>
  )
}
