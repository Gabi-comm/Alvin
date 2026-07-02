import {
  RECOMMENDATIONS,
  BEST_ROUTE,
  EMERGENCY_STATUS,
  comfortColor,
} from '../data/mockData'
import './BottomPanel.css'

function RecommendedCard() {
  return (
    <article className="card">
      <span className="card__label">RECOMMENDED FOR YOU</span>
      <div className="reco__list">
        {RECOMMENDATIONS.map((r) => (
          <div
            key={r.id}
            className={`reco__item${r.featured ? ' reco__item--featured' : ''}`}
          >
            <span className="reco__name">{r.name}</span>
            <span className="reco__reason">{r.reason}</span>
            <span
              className="reco__score"
              style={{ background: comfortColor(r.score) }}
            >
              {r.score}%
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}

function BestRouteCard() {
  return (
    <article className="card">
      <span className="card__label">BEST ROUTE ({BEST_ROUTE.mode})</span>
      <div className="route__body">
        <div className="route__info">
          <span className="route__name">{BEST_ROUTE.name}</span>
          <span className="route__via">{BEST_ROUTE.via}</span>
          <span className="route__duration">{BEST_ROUTE.duration}</span>
        </div>
        <div className="route__map" aria-hidden="true">
          <span className="route__map-line" />
        </div>
      </div>
    </article>
  )
}

function EmergencyCard() {
  const e = EMERGENCY_STATUS
  return (
    <article className={`card${e.active ? ' card--danger' : ''}`}>
      <span className="card__label">EMERGENCY STATUS</span>
      <div className="emergency__headline">
        <span className={`emergency__badge${e.active ? ' emergency__badge--active' : ''}`}>
          {e.active ? '⚠' : '✓'}
        </span>
        <div>
          <span className="emergency__title">{e.headline}</span>
          <span className="emergency__sub">{e.subtext}</span>
        </div>
      </div>
      <dl className="emergency__rows">
        <div><dt>Safe route</dt><dd>{e.safeRoute}</dd></div>
        <div><dt>Nearest exit</dt><dd>{e.nearestExit}</dd></div>
        <div><dt>Assembly area</dt><dd>{e.assemblyArea}</dd></div>
      </dl>
    </article>
  )
}

export default function BottomPanel() {
  return (
    <div className="bottom-panel">
      <RecommendedCard />
      <BestRouteCard />
      <EmergencyCard />
    </div>
  )
}
