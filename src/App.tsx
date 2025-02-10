import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import L from 'leaflet'

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const map = useMap()

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      map.flyTo(e.latlng, map.getZoom())
    })
  }, [map])

  return position === null ? null : (
    <Marker position={position} />
  )
}

function App() {
  const defaultPosition: [number, number] = [51.505, -0.09] // Default to London

  return (
    <div className="w-full h-full min-h-screen">
      <MapContainer
        center={defaultPosition}
        zoom={13}
        className="w-full h-full min-h-screen"
      >
        <TileLayer
          url={import.meta.env.VITE_MAP_TILE_URL}
          attribution={import.meta.env.VITE_MAP_ATTRIBUTION}
        />
        <LocationMarker />
      </MapContainer>
    </div>
  )
}

export default App
