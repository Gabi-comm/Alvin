import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { OUTDOOR_WEATHER } from '../data/mockData'
import { fetchWeather } from '../services/api'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/3d-twin', label: '3D Twin' },
  { to: '/', label: 'Map Overview', end: true },
  { to: '/environmental', label: 'Environmental' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/emergency', label: 'Emergency' },
  { to: '/devices', label: 'Devices' },
]

export default function Sidebar() {
  const [w, setW] = useState(OUTDOOR_WEATHER)

  useEffect(() => {
    let active = true
    fetchWeather().then((data) => {
      // Backend provides temp/heat index/condition; humidity, wind and rain
      // intensity aren't in that endpoint yet, so keep the mock values for those.
      if (active && data && data.status === 'success') {
        setW((prev) => ({
          ...prev,
          city: data.location ?? prev.city,
          temperature: Math.round(data.temperature_c ?? prev.temperature),
          heatIndex: `${Math.round(data.heat_index_c ?? 0)} C`,
          condition: data.is_raining ? 'Rain detected' : data.condition ?? prev.condition,
          source: 'Live · ALVIN backend',
        }))
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">A</span>
        <div className="sidebar__title">
          <span className="sidebar__name">ALVIN</span>
          <span className="sidebar__tagline">Adaptive Living Virtual Intelligence Network</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__weather">
        <span className="sidebar__section-label">OUTDOOR WEATHER</span>
        <span className="sidebar__city">{w.city}</span>

        <div className="sidebar__temp-row">
          <span className="sidebar__weather-icon" aria-hidden="true">🌧️</span>
          <div>
            <span className="sidebar__temp">
              {w.temperature}<span className="sidebar__temp-unit">c</span>
            </span>
            <span className="sidebar__condition">{w.condition}</span>
          </div>
        </div>

        <dl className="sidebar__metrics">
          <div><dt>Humidity</dt><dd>{w.humidity}%</dd></div>
          <div><dt>Rain Intensity</dt><dd>{w.rainIntensity}</dd></div>
          <div><dt>Wind</dt><dd>{w.wind}</dd></div>
          <div><dt>Heat Index</dt><dd>{w.heatIndex}</dd></div>
        </dl>

        <div className="sidebar__source">
          <span>Source: {w.source}</span>
          <span>Updated: {w.updatedAt}</span>
        </div>
      </div>
    </aside>
  )
}
