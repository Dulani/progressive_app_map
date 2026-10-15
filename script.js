// This is the main script file.

// --- Global Scope Variable Declarations ---
// These are declared here so they can be accessed by functions,
// but initialized after DOM is ready or as needed.
let map;
let currentRouteLayer = null; // Holds the current GPX/KML layer displayed on the map
let weatherLayer = null;      // Holds the OpenWeatherMap tile overlay
let userOwmApiKey = null;     // Holds the user-provided OpenWeatherMap API key
let nexradLayer = null;       // Holds the NEXRAD WMS layer
let locationMarker = null;    // Marker for the user's current location
let locationCircle = null;    // Accuracy circle around the user's location

const DEFAULT_VIEW = { center: [39.8, -98.6], zoom: 4 }; // Contiguous USA

// Shows a short, non-blocking status message at the bottom of the screen.
let toastTimer = null;
function toast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', type === 'error');
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), type === 'error' ? 6000 : 3000);
}

function loadSavedView() {
    try {
        const view = JSON.parse(localStorage.getItem('mapView'));
        if (view && Array.isArray(view.center) && typeof view.zoom === 'number') return view;
    } catch (error) {
        console.warn('Ignoring invalid saved map view:', error);
    }
    return DEFAULT_VIEW;
}

document.addEventListener('DOMContentLoaded', function() {
    // --- Initialize Map ---
    const initialView = loadSavedView();
    map = L.map('map').setView(initialView.center, initialView.zoom);

    // Add base tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // --- DOM Element References ---
    const geolocateBtn = document.getElementById('geolocateBtn');
    const fileInput = document.getElementById('fileInput');
    const loadRouteBtn = document.getElementById('loadRouteBtn');
    const saveRouteBtn = document.getElementById('saveRouteBtn');
    const weatherToggle = document.getElementById('weatherToggle');
    const weatherLayerSelect = document.getElementById('weatherLayerSelect');
    const nexradRadarToggle = document.getElementById('nexradRadarToggle');
    const owmApiKeyInput = document.getElementById('owmApiKeyInput');
    const saveOwmApiKeyBtn = document.getElementById('saveOwmApiKeyBtn');

    // --- Functions --- (Defined within DOMContentLoaded to ensure access to `map` and DOM elements)

    function updateWeatherToggleState() {
        if (!weatherToggle) return;
        if (userOwmApiKey) {
            weatherToggle.disabled = false;
            weatherToggle.title = 'Toggle OpenWeatherMap weather layer';
        } else {
            weatherToggle.disabled = true;
            weatherToggle.checked = false;
            removeWeatherLayer();
            weatherToggle.title = 'Enter and save an OpenWeatherMap API key to enable this layer.';
        }
    }

    function removeWeatherLayer() {
        if (weatherLayer) {
            map.removeLayer(weatherLayer);
            weatherLayer = null;
        }
    }

    // Weather is drawn as an OpenWeatherMap tile overlay. Tiles work with free API keys,
    // and Leaflet only requests the tiles in view, so no per-pan API calls are needed.
    function showWeatherLayer() {
        removeWeatherLayer();
        if (!userOwmApiKey) return;
        const owmLayer = weatherLayerSelect ? weatherLayerSelect.value : 'precipitation_new';
        let reportedError = false;
        weatherLayer = L.tileLayer('https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={key}', {
            layer: owmLayer,
            key: encodeURIComponent(userOwmApiKey),
            maxZoom: 19,
            opacity: 0.6,
            attribution: 'Weather &copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
        });
        weatherLayer.on('tileerror', () => {
            if (reportedError) return; // One message per layer, not one per tile
            reportedError = true;
            toast('Weather tiles failed to load. Check your OpenWeatherMap API key (new keys can take a few hours to activate).', 'error');
        });
        weatherLayer.addTo(map);
    }

    // Builds a popup element using textContent so names/descriptions from
    // user-supplied files can never be interpreted as HTML.
    function textPopup(text) {
        const el = document.createElement('div');
        el.textContent = text;
        return el;
    }

    // Replaces the current route layer with the given GeoJSON and zooms to it.
    // Returns false (leaving the map untouched) if there's nothing to draw.
    function renderRoute(geojson) {
        if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
            return false;
        }
        const layer = L.geoJSON(geojson, {
            onEachFeature: function (feature, featureLayer) {
                const props = feature.properties || {};
                featureLayer.bindPopup(textPopup(props.name || props.desc || 'Route Feature'));
            }
        });
        const bounds = layer.getBounds();
        if (!bounds.isValid()) return false;

        if (currentRouteLayer) map.removeLayer(currentRouteLayer);
        currentRouteLayer = layer.addTo(map);
        map.fitBounds(bounds);
        return true;
    }

    function loadLastSavedRoute() {
        const savedRoute = localStorage.getItem('savedRouteGeoJSON');
        if (!savedRoute) {
            toast('No saved route found.');
            return;
        }
        let geojsonData;
        try {
            geojsonData = JSON.parse(savedRoute);
        } catch (error) {
            console.error('Error parsing saved route from localStorage:', error);
            toast('Could not load saved route. Data is corrupted and has been removed.', 'error');
            localStorage.removeItem('savedRouteGeoJSON');
            return;
        }
        if (renderRoute(geojsonData)) {
            toast('Saved route loaded.');
        } else {
            toast('The saved route has no drawable features.', 'error');
        }
    }

    function saveCurrentRoute() {
        if (!currentRouteLayer) {
            toast('No current route to save.');
            return;
        }
        try {
            localStorage.setItem('savedRouteGeoJSON', JSON.stringify(currentRouteLayer.toGeoJSON()));
            toast('Route saved.');
        } catch (error) {
            console.error('Error saving route:', error);
            toast('Could not save the route. It may be too large for browser storage.', 'error');
        }
    }

    function showLocation(position) {
        const latlng = [position.coords.latitude, position.coords.longitude];
        // Reuse one marker/circle instead of adding a new marker on every click.
        if (locationMarker) {
            locationMarker.setLatLng(latlng);
            locationCircle.setLatLng(latlng).setRadius(position.coords.accuracy);
        } else {
            locationMarker = L.marker(latlng).addTo(map).bindPopup('You are here!');
            locationCircle = L.circle(latlng, { radius: position.coords.accuracy, weight: 1, fillOpacity: 0.1 }).addTo(map);
        }
        map.setView(latlng, Math.max(map.getZoom(), 15));
        locationMarker.openPopup();
    }

    // --- Initial Setup ---
    userOwmApiKey = localStorage.getItem('userOwmApiKey');
    if (userOwmApiKey && owmApiKeyInput) {
        owmApiKeyInput.value = userOwmApiKey;
    }
    updateWeatherToggleState();

    // --- Event Listeners ---
    if (geolocateBtn) {
        geolocateBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                toast('Geolocation is not supported by this browser.', 'error');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                showLocation,
                (error) => { console.error('Error getting location:', error); toast('Error getting location: ' + error.message, 'error'); },
                { enableHighAccuracy: true, timeout: 15000 }
            );
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileName = file.name.toLowerCase();
                    const xmlDoc = new DOMParser().parseFromString(e.target.result, 'text/xml');
                    // DOMParser doesn't throw on bad XML; it returns a document containing <parsererror>.
                    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                        toast('This file is not valid XML. Please select a valid GPX or KML file.', 'error');
                        return;
                    }
                    let geojson;
                    try {
                        if (fileName.endsWith('.gpx')) geojson = toGeoJSON.gpx(xmlDoc);
                        else if (fileName.endsWith('.kml')) geojson = toGeoJSON.kml(xmlDoc);
                        else { toast('Unsupported file type. Please select a .gpx or .kml file.', 'error'); return; }
                    } catch (parseError) {
                        console.error('Error converting GPX/KML file:', parseError);
                        toast(`Error processing file: ${parseError.message}`, 'error');
                        return;
                    }
                    if (renderRoute(geojson)) {
                        toast('Route loaded. Use "Save Current Route" to keep it.');
                    } else {
                        toast('No tracks, routes, or points were found in this file.', 'error');
                    }
                };
                reader.onerror = function() { toast('Error reading file.', 'error'); };
                reader.readAsText(file);
                fileInput.value = ''; // Allow re-selecting the same file
            }
        });
    }

    if (loadRouteBtn) loadRouteBtn.addEventListener('click', loadLastSavedRoute);
    if (saveRouteBtn) saveRouteBtn.addEventListener('click', saveCurrentRoute);

    if (saveOwmApiKeyBtn && owmApiKeyInput) {
        saveOwmApiKeyBtn.addEventListener('click', function() {
            const keyValue = owmApiKeyInput.value.trim();
            if (keyValue) {
                localStorage.setItem('userOwmApiKey', keyValue);
                userOwmApiKey = keyValue;
                toast('OpenWeatherMap API key saved.');
                if (weatherToggle && weatherToggle.checked) showWeatherLayer(); // Pick up the new key
            } else {
                localStorage.removeItem('userOwmApiKey');
                userOwmApiKey = null;
                toast('OpenWeatherMap API key cleared. Weather layer disabled.');
            }
            updateWeatherToggleState();
        });
    }

    if (weatherToggle) {
        weatherToggle.addEventListener('change', () => {
            if (weatherToggle.checked) showWeatherLayer();
            else removeWeatherLayer();
        });
    }

    if (weatherLayerSelect) {
        weatherLayerSelect.addEventListener('change', () => {
            if (weatherToggle && weatherToggle.checked) showWeatherLayer();
        });
    }

    if (nexradRadarToggle) {
        nexradRadarToggle.addEventListener('change', function() {
            if (this.checked) {
                if (nexradLayer) map.removeLayer(nexradLayer);
                nexradLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
                    layers: 'nexrad-n0r-900913',
                    format: 'image/png',
                    transparent: true,
                    attribution: '&copy; <a href="https://mesonet.agron.iastate.edu/">Iowa State University IEM</a>'
                }).addTo(map);
                // Keep radar above the base map but below markers/popups
                nexradLayer.setZIndex(5);
            } else if (nexradLayer) {
                map.removeLayer(nexradLayer);
                nexradLayer = null;
            }
        });
    }

    // Remember the last view so the app reopens where the user left off.
    map.on('moveend', () => {
        const center = map.getCenter();
        try {
            localStorage.setItem('mapView', JSON.stringify({ center: [center.lat, center.lng], zoom: map.getZoom() }));
        } catch (error) {
            // Storage may be unavailable (private mode); the view just won't persist.
        }
    });

    // Register service worker (relative path so it works under a GitHub Pages project subpath)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => { console.log('ServiceWorker registration successful with scope: ', registration.scope); })
                .catch(error => { console.log('ServiceWorker registration failed: ', error); });
        });
    }
});
