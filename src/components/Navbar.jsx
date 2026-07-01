import './Navbar.css'

const NAV_LINKS = [
  { id: 'twin', label: '3D Digital Twin' },
  { id: 'map', label: 'Live Heat & Rain Map', active: true },
  { id: 'recommend', label: 'Recommendations' },
  { id: 'emergency', label: 'Emergency' },
]

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">A</span>
        <div className="navbar__title">
          <span className="navbar__name">ALVIN</span>
          <span className="navbar__tagline">Adaptive Living Virtual Intelligence Network</span>
        </div>
      </div>

      <nav className="navbar__nav">
        {NAV_LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className={`navbar__link${link.active ? ' navbar__link--active' : ''}`}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="navbar__status">
        <span className="navbar__dot" aria-hidden="true" />
        <span>Systems Normal</span>
      </div>
    </header>
  )
}
