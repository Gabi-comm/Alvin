import Navbar from './components/Navbar'
import MapView from './components/MapView'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app__main">
        <MapView />
      </main>
    </div>
  )
}
