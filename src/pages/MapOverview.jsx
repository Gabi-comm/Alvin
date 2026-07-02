import { useState } from 'react'
import MapView from '../components/MapView'
import RoomPanel from '../components/RoomPanel'
import BottomPanel from '../components/BottomPanel'
import { ROOMS } from '../data/mockData'
import './MapOverview.css'

export default function MapOverview() {
  const [selectedId, setSelectedId] = useState('library')
  const [open, setOpen] = useState(true)
  const selected = ROOMS.find((r) => r.id === selectedId)

  return (
    <div className="map-overview">
      <div className="map-overview__stage">
        <MapView />
        {open ? (
          <div className="map-overview__aside">
            <label className="map-overview__picker">
              <span>Inspect space</span>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <RoomPanel room={selected} onClose={() => setOpen(false)} />
          </div>
        ) : (
          <button className="map-overview__reopen" onClick={() => setOpen(true)}>
            Space details
          </button>
        )}
      </div>
      <BottomPanel />
    </div>
  )
}
