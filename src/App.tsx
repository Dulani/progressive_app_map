import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import './App.css'
import type { Icon, LatLngExpression, Map } from 'leaflet'
import type React from 'react'
import type ReactDOM from 'react-dom'

declare global {
  interface Window {
    React: typeof React;
    ReactDOM: typeof ReactDOM;
    L: {
      icon: (options: any) => Icon;
      Marker: { prototype: { options: { icon: Icon } } };
      Map: typeof Map;
    };
  }
}

// Fix Leaflet default marker icon issue
const DefaultIcon = window.L.icon({
  iconUrl: `${import.meta.env.BASE_URL}marker-icon.png`,
  iconRetinaUrl: `${import.meta.env.BASE_URL}marker-icon-2x.png`,
  shadowUrl: `${import.meta.env.BASE_URL}marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

window.L.Marker.prototype.options.icon = DefaultIcon

function LocationMarker() {
  const [position, setPosition] = useState<LatLngExpression | null>(null)
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
  const defaultPosition: LatLngExpression = [51.505, -0.09] // Default to London

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
