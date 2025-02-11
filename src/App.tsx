import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import L from 'leaflet'

// Fix Leaflet default marker icon issue
const DefaultIcon = L.icon({
  iconUrl: `${import.meta.env.BASE_URL}marker-icon.png`,
  iconRetinaUrl: `${import.meta.env.BASE_URL}marker-icon-2x.png`,
  shadowUrl: `${import.meta.env.BASE_URL}marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={defaultPosition}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
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
