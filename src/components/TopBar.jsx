import { BUILDINGS, FLOORS } from '../data/mockData'
import './TopBar.css'

const DATE_LABEL = 'May 16, 2025 10:15 AM'

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar__selectors">
        <label className="topbar__select">
          <select defaultValue={BUILDINGS[0]}>
            {BUILDINGS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="topbar__select">
          <select defaultValue={FLOORS[0]}>
            {FLOORS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="topbar__right">
        <span className="topbar__date">{DATE_LABEL}</span>
        <button className="topbar__icon-btn" aria-label="Notifications">
          🔔<span className="topbar__badge">2</span>
        </button>
        <button className="topbar__avatar" aria-label="Account">👤</button>
      </div>
    </header>
  )
}
