// Mock data for the ALVIN dashboard. This stands in for the live feeds
// (Firebase Realtime DB for indoor sensors, Open-Meteo/PAGASA for weather)
// until the data layer is wired up.

// --- Seda BGC (the monitored hotel) ---
// Seda Bonifacio Global City — 30th St cor 11th Ave, BGC, Taguig.
export const SEDA_BGC = {
  name: 'Seda BGC',
  partner: 'Partner Safe Building',
  address: '30th St cor 11th Ave, BGC, Taguig',
  coords: [121.05305119776797, 14.550777759931028], // [lng, lat]
}

// The building marker location on the map.
export const USER_LOCATION = {
  name: 'Seda BGC',
  coords: SEDA_BGC.coords,
}

// Evacuation destination during an emergency — Seda BGC itself is the partner
// safe building. The origin is the user's live device location (see context).
export const EVAC_CENTER = SEDA_BGC

// Fallback origin for routing when device geolocation is denied/unavailable
// (a nearby BGC point so the walking route is still meaningful).
export const DEFAULT_ORIGIN = [121.0455, 14.547]

export const BUILDINGS = ['Seda BGC', 'Seda Vertis North', 'Seda Ayala Center']
export const FLOORS = ['Ground Floor', '5th Floor', '6th Floor']

// Comfort score (0-100) -> color band, matching the legend in the design.
export const COMFORT_BANDS = [
  { label: 'Excellent (90-100)', min: 90, color: '#22c55e' },
  { label: 'Good (70-89)', min: 70, color: '#4ade80' },
  { label: 'Moderate (50-69)', min: 50, color: '#fbbf24' },
  { label: 'Poor (30-49)', min: 30, color: '#fb923c' },
  { label: 'Very Poor (0-29)', min: 0, color: '#ef4444' },
]

export function comfortColor(score) {
  const band = COMFORT_BANDS.find((b) => score >= b.min)
  return band ? band.color : '#ef4444'
}

// The single hardware-connected room. Its node id is the connection key shared
// by the ESP32 firmware (config.h NODE_ID) and the backend — keep them in sync.
export const HARDWARE_NODE_ID = 'node_r610'

// One monitored room. These are fallback values only; the live temperature /
// humidity / comfort come from the DHT22 via the backend (/api/rooms).
export const ROOMS = [
  {
    id: HARDWARE_NODE_ID,
    name: 'Room 610',
    wing: 'Premier Suite · 6F',
    room: '610',
    score: 95,
    temp: 24.3,
    humidity: 52,
    airflow: 0.6,
    noise: 30,
    occupancy: 2,
    capacity: 2,
  },
]

// Qualitative label for an airflow reading (m/s).
export function airflowLabel(v) {
  if (v >= 0.6) return 'Good'
  if (v >= 0.4) return 'Moderate'
  return 'Low'
}

// Qualitative label for a noise reading (dB).
export function noiseLabel(db) {
  if (db <= 40) return `Low (${db} dB)`
  if (db <= 55) return `Moderate (${db} dB)`
  return `High (${db} dB)`
}

// The single ESP32 + DHT22 node. Live status comes from the backend
// (/api/devices) once the hardware registers itself on boot.
export const DEVICES = [
  { id: 'esp32-01', room: 'Room 610', sensors: ['Temp', 'Humidity'], battery: 100, status: 'online', lastSeen: 'just now' },
]

// Emergency scenarios ALVIN adapts to (from the concept table).
export const EMERGENCY_SCENARIOS = [
  { id: 'fire', name: 'Fire', response: 'Safest evacuation exits', icon: 'fire' },
  { id: 'earthquake', name: 'Earthquake', response: 'Safe waiting areas', icon: 'quake' },
  { id: 'flood', name: 'Flood', response: 'Avoid flooded entrances', icon: 'flood' },
  { id: 'rain', name: 'Heavy Rain', response: 'Covered walkways', icon: 'cloud-rain' },
  { id: 'heat', name: 'Extreme Heat', response: 'Cooling zones', icon: 'thermometer' },
]

export const OUTDOOR_WEATHER = {
  city: 'Manila City',
  temperature: 26,
  condition: 'Cloudy',
  humidity: 93,
  rainIntensity: '0.0 mm/h',
  wind: '7 km/h',
  heatIndex: '31 C',
  source: 'Live Open-Meteo',
  updatedAt: '5:45 AM',
}

export const RECOMMENDATIONS = [
  { id: HARDWARE_NODE_ID, name: 'Room 610', reason: 'Live monitored room', score: 95, featured: true },
]

// Default start/end nodes for the live navigation query.
export const NAV_DEFAULTS = {
  start: 'node_lobby',
  end: 'node_r610',
  preference: 'covered',
}

export const EMERGENCY_STATUS = {
  active: false,
  headline: 'No Active Emergency',
  subtext: 'All systems normal',
  safeRoute: 'Seda BGC',
  nearestExit: 'Main Lobby',
  assemblyArea: 'Seda BGC Lobby',
}
