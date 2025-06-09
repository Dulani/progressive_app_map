// This is the main script file.

// --- Global Scope Variable Declarations ---
// These are declared here so they can be accessed by functions,
// but initialized after DOM is ready or as needed.
let map;
let currentRouteLayer = null; // Holds the current GPX/KML layer displayed on the map
let weatherLayer;             // Layer group for weather markers
let gasPriceLayer;            // Layer group for gas price markers
let userOwmApiKey = null;     // Holds the user-provided OpenWeatherMap API key
let nexradLayer = null;       // Holds the NEXRAD WMS layer

document.addEventListener('DOMContentLoaded', function() {
    // --- Initialize Map ---
    map = L.map('map').setView([51.505, -0.09], 13);

    // Initialize layer groups (can be added to map when toggled)
    weatherLayer = L.layerGroup();
    gasPriceLayer = L.layerGroup();

    // Add base tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // --- DOM Element References ---
    const geolocateBtn = document.getElementById('geolocateBtn');
    const fileInput = document.getElementById('fileInput');
    const loadRouteBtn = document.getElementById('loadRouteBtn');
    const saveRouteBtn = document.getElementById('saveRouteBtn');
    const weatherToggle = document.getElementById('weatherToggle');
    const gasPriceToggle = document.getElementById('gasPriceToggle');
    const nexradRadarToggle = document.getElementById('nexradRadarToggle'); // Get ref to new toggle
    const owmApiKeyInput = document.getElementById('owmApiKeyInput');
    const saveOwmApiKeyBtn = document.getElementById('saveOwmApiKeyBtn');

    // --- Functions --- (Defined within DOMContentLoaded to ensure access to `map` and DOM elements)

    function updateWeatherToggleState() {
        if (userOwmApiKey) {
            if (weatherToggle) {
                weatherToggle.disabled = false;
                weatherToggle.title = 'Toggle OpenWeatherMap weather layer';
            }
        } else {
            if (weatherToggle) {
                weatherToggle.disabled = true;
                weatherToggle.checked = false; // Uncheck if no key
                if (weatherLayer && map.hasLayer(weatherLayer)) { // Clear layer if key removed and layer exists
                    weatherLayer.clearLayers();
                    map.removeLayer(weatherLayer);
                } else if (weatherLayer) {
                    weatherLayer.clearLayers(); // Ensure it's cleared even if not on map
                }
                weatherToggle.title = 'Enter and save an OpenWeatherMap API key to enable this layer.';
            }
            console.warn('OpenWeatherMap API key is not set. Weather layer is disabled.');
        }
    }

    // --- Initial Setup ---
    userOwmApiKey = localStorage.getItem('userOwmApiKey');
    if (userOwmApiKey && owmApiKeyInput) {
        owmApiKeyInput.value = userOwmApiKey;
    }
    updateWeatherToggleState(); // Call after loading key


    function loadLastSavedRoute() {
        const savedRoute = localStorage.getItem('savedRouteGeoJSON');
        if (savedRoute) {
            try {
                const geojsonData = JSON.parse(savedRoute);
                if (currentRouteLayer) {
                    map.removeLayer(currentRouteLayer);
                }
                currentRouteLayer = L.geoJSON(geojsonData, {
                    onEachFeature: function (feature, layer) {
                        let popupContent = "Route Feature";
                        if (feature.properties) {
                            if (feature.properties.name) popupContent = feature.properties.name;
                            else if (feature.properties.desc) popupContent = feature.properties.desc;
                        }
                        layer.bindPopup(popupContent);
                    }
                }).addTo(map);
                map.fitBounds(currentRouteLayer.getBounds());
                alert('Route loaded from local storage!');
            } catch (error) {
                console.error('Error parsing saved route from localStorage:', error);
                alert('Could not load saved route. Data might be corrupted. The corrupted route has been removed.');
                localStorage.removeItem('savedRouteGeoJSON');
            }
        } else {
            alert('No saved route found in local storage.');
        }
    }

    function saveCurrentRoute() {
        if (currentRouteLayer) {
            const geojsonData = currentRouteLayer.toGeoJSON();
            localStorage.setItem('savedRouteGeoJSON', JSON.stringify(geojsonData));
            alert('Current route saved to local storage!');
        } else {
            alert('No current route to save.');
        }
    }

    function updateWeather() {
        if (!weatherToggle || !weatherToggle.checked) {
            weatherLayer.clearLayers();
            if (map.hasLayer(weatherLayer)) map.removeLayer(weatherLayer);
            return;
        }
        if (!userOwmApiKey) { // Check if the user-provided key exists
            alert('OpenWeatherMap API Key is missing. Please enter and save it first.');
            if (weatherToggle) weatherToggle.checked = false; // Ensure toggle is off
            weatherLayer.clearLayers();
            if (map.hasLayer(weatherLayer)) map.removeLayer(weatherLayer);
            return;
        }
        const bounds = map.getBounds();
        const apiUrl = `https://api.openweathermap.org/data/2.5/box/city?bbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()},${map.getZoom()}&appid=${userOwmApiKey}&units=metric`; // Use userOwmApiKey
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(`HTTP error ${response.status}: ${errData.message || response.statusText}`);
                    }).catch(() => { throw new Error(`HTTP error ${response.status}: ${response.statusText}`); });
                }
                return response.json();
            })
            .then(data => {
                weatherLayer.clearLayers();
                if (data.list && data.list.length > 0) {
                    data.list.forEach(station => {
                        if (station.coord && station.coord.Lat && station.coord.Lon && station.weather && station.weather[0]) {
                            const iconUrl = `https://openweathermap.org/img/wn/${station.weather[0].icon}@2x.png`;
                            const weatherIcon = L.icon({ iconUrl: iconUrl, iconSize: [50, 50], iconAnchor: [25, 25], popupAnchor: [0, -25] });
                            const popupContent = `<b>${station.name}</b><br>${station.main.temp}°C, ${station.weather[0].description}`;
                            L.marker([station.coord.Lat, station.coord.Lon], { icon: weatherIcon }).bindPopup(popupContent).addTo(weatherLayer);
                        } else { console.warn('Skipping weather station due to missing data:', station); }
                    });
                } else { console.log('No weather stations found for the current view.'); }
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                alert(`Could not fetch weather data: ${error.message}`);
            });
    }

    function updateGasPrices() {
        if (!gasPriceToggle || !gasPriceToggle.checked) {
            gasPriceLayer.clearLayers();
            if (map.hasLayer(gasPriceLayer)) map.removeLayer(gasPriceLayer);
            return;
        }
        console.warn('updateGasPrices called. Gas price API integration is PENDING.');
        alert('Gas Price Layer: API integration is needed. Displaying placeholder data. See console for details.');
        gasPriceLayer.clearLayers();
        if (map.getCenter()) {
            const center = map.getCenter();
            L.marker(center).bindPopup('Sample Gas Station (Central)<br>Price: $X.XX').addTo(gasPriceLayer);
            L.marker([center.lat + 0.005, center.lng - 0.005]).bindPopup('Sample Gas Station (SW)<br>Price: $Y.YY').addTo(gasPriceLayer);
            L.marker([center.lat - 0.005, center.lng + 0.005]).bindPopup('Sample Gas Station (NE)<br>Price: $Z.ZZ').addTo(gasPriceLayer);
        } else { console.log("Map center not available for gas price placeholders."); }
    }

    // --- Event Listeners ---
    if (geolocateBtn) {
        geolocateBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        map.setView([position.coords.latitude, position.coords.longitude], 15);
                        L.marker([position.coords.latitude, position.coords.longitude]).addTo(map).bindPopup('You are here!').openPopup();
                    },
                    (error) => { console.error('Error getting location:', error); alert('Error getting location: ' + error.message); }
                );
            } else { alert('Geolocation is not supported by this browser.'); }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileName = file.name.toLowerCase();
                    const domParser = new DOMParser();
                    const xmlDoc = domParser.parseFromString(e.target.result, 'text/xml');
                    let geojson;
                    try {
                        if (fileName.endsWith('.gpx')) geojson = toGeoJSON.gpx(xmlDoc);
                        else if (fileName.endsWith('.kml')) geojson = toGeoJSON.kml(xmlDoc);
                        else { alert('Unsupported file type. Please select a .gpx or .kml file.'); return; }

                        if (currentRouteLayer) map.removeLayer(currentRouteLayer);
                        currentRouteLayer = L.geoJSON(geojson, {
                            onEachFeature: function (feature, layer) {
                                let popupContent = "Route Feature";
                                if (feature.properties) {
                                    if (feature.properties.name) popupContent = feature.properties.name;
                                    else if (feature.properties.desc) popupContent = feature.properties.desc;
                                }
                                layer.bindPopup(popupContent);
                            }
                        }).addTo(map);
                        map.fitBounds(currentRouteLayer.getBounds());
                        alert('Route loaded successfully!');
                    } catch (parseError) {
                        console.error('Error parsing/displaying GPX/KML file:', parseError);
                        alert(`Error processing file: ${parseError.message}. Make sure the file is a valid GPX or KML.`);
                    }
                };
                reader.onerror = function() { alert('Error reading file.'); };
                reader.readAsText(file);
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
                alert('OpenWeatherMap API Key saved!');
            } else {
                localStorage.removeItem('userOwmApiKey'); // Remove if key is cleared
                userOwmApiKey = null;
                alert('OpenWeatherMap API Key cleared. Weather layer will be disabled.');
            }
            updateWeatherToggleState(); // Update toggle state based on new key status
        });
    }

    if (weatherToggle) { // Note: No longer checking !weatherToggle.disabled here as state is managed by updateWeatherToggleState
        weatherToggle.addEventListener('change', () => {
            if (weatherToggle.checked) {
                if (!userOwmApiKey) { // Double check, though toggle should be disabled
                    alert('Cannot enable weather layer: OpenWeatherMap API key is missing.');
                    weatherToggle.checked = false;
                    return;
                }
                if (!map.hasLayer(weatherLayer)) weatherLayer.addTo(map);
                updateWeather();
            } else {
                weatherLayer.clearLayers();
                if (map.hasLayer(weatherLayer)) map.removeLayer(weatherLayer);
            }
        });
    }

    if (gasPriceToggle) {
        gasPriceToggle.addEventListener('change', () => {
            if (gasPriceToggle.checked) {
                if (!map.hasLayer(gasPriceLayer)) gasPriceLayer.addTo(map);
                updateGasPrices();
            } else {
                gasPriceLayer.clearLayers();
                if (map.hasLayer(gasPriceLayer)) map.removeLayer(gasPriceLayer);
            }
        });
    }

    map.on('moveend', () => {
        if (weatherToggle && weatherToggle.checked && !weatherToggle.disabled) updateWeather();
        if (gasPriceToggle && gasPriceToggle.checked) updateGasPrices();
    });

    if (nexradRadarToggle) {
        nexradRadarToggle.addEventListener('change', function() {
            if (this.checked) {
                if (nexradLayer && map.hasLayer(nexradLayer)) { // If layer somehow exists, remove before re-adding
                    map.removeLayer(nexradLayer);
                }
                nexradLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
                    layers: 'nexrad-n0r-900913',
                    format: 'image/png',
                    transparent: true,
                    attribution: '&copy; <a href="https://mesonet.agron.iastate.edu/">Iowa State University IEM</a>'
                }).addTo(map);
                // Optional: Set zIndex to ensure it's on top or below other layers as desired
                // For example, to try and place it above most other tile layers but below markers/popups
                if (nexradLayer.setZIndex) nexradLayer.setZIndex(5);
            } else {
                if (nexradLayer && map.hasLayer(nexradLayer)) {
                    map.removeLayer(nexradLayer);
                    nexradLayer = null; // Clear the reference
                }
            }
        });
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => { // Use window.load for SW registration to ensure page is fully loaded
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => { console.log('ServiceWorker registration successful with scope: ', registration.scope); })
                .catch(error => { console.log('ServiceWorker registration failed: ', error); });
        });
    }
});
