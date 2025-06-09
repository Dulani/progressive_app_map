// This is the main script file.
const OWM_API_KEY = 'YOUR_API_KEY_HERE'; // IMPORTANT: Replace with your OpenWeatherMap API key
if (OWM_API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn('OpenWeatherMap API key is not set. Weather layer will not work.');
    // Optionally, you could alert the user here or disable the weather toggle
    // alert('OpenWeatherMap API key is not set. Weather layer will not work.');
}

let currentRouteLayer = null; // Holds the current GPX/KML layer
let weatherLayer = L.layerGroup().addTo(map); // Layer group for weather markers
let gasPriceLayer = L.layerGroup().addTo(map); // Layer group for gas price markers

// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13); // Use const for map

// Add a tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' // Added "contributors"
}).addTo(map);

// Disable weather toggle if API key is missing
if (OWM_API_KEY === 'YOUR_API_KEY_HERE') {
    const weatherToggle = document.getElementById('weatherToggle');
    if (weatherToggle) {
        weatherToggle.disabled = true;
        const weatherLabel = document.querySelector('label[for="weatherToggle"]');
        if (weatherLabel) {
            weatherLabel.title = 'OpenWeatherMap API key is not set in script.js';
        }
    }
}

// Geolocation functionality
const geolocateBtn = document.getElementById('geolocateBtn');

if (geolocateBtn) {
    geolocateBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    map.setView([latitude, longitude], 15);
                    L.marker([latitude, longitude]).addTo(map)
                        .bindPopup('You are here!')
                        .openPopup();
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Error getting location: ' + error.message);
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    });
}

// File and Route Handling
const fileInput = document.getElementById('fileInput');
const loadRouteBtn = document.getElementById('loadRouteBtn');
const saveRouteBtn = document.getElementById('saveRouteBtn');

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
                if (fileName.endsWith('.gpx')) {
                    geojson = toGeoJSON.gpx(xmlDoc);
                } else if (fileName.endsWith('.kml')) {
                    geojson = toGeoJSON.kml(xmlDoc);
                } else {
                    alert('Unsupported file type. Please select a .gpx or .kml file.');
                    return;
                }

                if (currentRouteLayer) {
                    map.removeLayer(currentRouteLayer);
                }
                try {
                    currentRouteLayer = L.geoJSON(geojson, {
                        onEachFeature: function (feature, layer) {
                            let popupContent = "Route Feature";
                            if (feature.properties) {
                                if (feature.properties.name) {
                                    popupContent = feature.properties.name;
                                } else if (feature.properties.desc) {
                                    popupContent = feature.properties.desc;
                                }
                            }
                            layer.bindPopup(popupContent);
                        }
                    }).addTo(map);
                    map.fitBounds(currentRouteLayer.getBounds());
                    alert('Route loaded successfully!');
                } catch (parseError) {
                    console.error('Error processing GeoJSON from file:', parseError);
                    alert('Error displaying the route: ' + parseError.message);
                }
            };
            reader.onerror = function() { // Handle file reading errors
                alert('Error reading file.');
            };
            reader.readAsText(file);
        }
    });
}

function loadLastSavedRoute() {
    const savedRoute = localStorage.getItem('savedRouteGeoJSON');
    if (savedRoute) {
        try {
            const geojsonData = JSON.parse(savedRoute);
            if (currentRouteLayer) {
                map.removeLayer(currentRouteLayer);
            }
            currentRouteLayer = L.geoJSON(geojsonData, { // Also add onEachFeature here for consistency
                onEachFeature: function (feature, layer) {
                    let popupContent = "Route Feature";
                    if (feature.properties) {
                        if (feature.properties.name) {
                            popupContent = feature.properties.name;
                        } else if (feature.properties.desc) {
                            popupContent = feature.properties.desc;
                        }
                    }
                    layer.bindPopup(popupContent);
                }
            }).addTo(map);
            map.fitBounds(currentRouteLayer.getBounds());
            alert('Route loaded from local storage!');
        } catch (error) {
            console.error('Error parsing saved route from localStorage:', error);
            alert('Could not load saved route. Data might be corrupted. The corrupted route has been removed.');
            localStorage.removeItem('savedRouteGeoJSON'); // Clear corrupted data
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

if (loadRouteBtn) {
    loadRouteBtn.addEventListener('click', loadLastSavedRoute);
}

if (saveRouteBtn) {
    saveRouteBtn.addEventListener('click', saveCurrentRoute);
}

// Weather Layer Functionality
const weatherToggle = document.getElementById('weatherToggle');

function updateWeather() {
    const weatherToggle = document.getElementById('weatherToggle'); // Get inside function to ensure it's available

    if (!weatherToggle || !weatherToggle.checked) {
        weatherLayer.clearLayers();
        if (map.hasLayer(weatherLayer)) { // Only remove if it was added
            map.removeLayer(weatherLayer);
        }
        return;
    }

    if (OWM_API_KEY === 'YOUR_API_KEY_HERE') {
        // This state should ideally be prevented by disabling the checkbox if key is missing
        alert('OpenWeatherMap API key is not set. Please configure it in script.js.');
        if (weatherToggle) weatherToggle.checked = false;
        weatherLayer.clearLayers();
        if (map.hasLayer(weatherLayer)) map.removeLayer(weatherLayer);
        return;
    }

    const bounds = map.getBounds();
    const apiUrl = `https://api.openweathermap.org/data/2.5/box/city?bbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()},${map.getZoom()}&appid=${OWM_API_KEY}&units=metric`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                // Try to parse error response from OWM, which is often JSON
                return response.json().then(errData => {
                    throw new Error(`HTTP error ${response.status}: ${errData.message || response.statusText}`);
                }).catch(() => { // Fallback if error response isn't JSON
                    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            weatherLayer.clearLayers();
            if (data.list && data.list.length > 0) {
                data.list.forEach(station => {
                    if (station.coord && station.coord.Lat && station.coord.Lon && station.weather && station.weather[0]) {
                        const iconUrl = `https://openweathermap.org/img/wn/${station.weather[0].icon}@2x.png`; // Use @2x icons
                        const weatherIcon = L.icon({
                            iconUrl: iconUrl,
                            iconSize: [50, 50], // OWM icons are 50x50 for @2x, or adjust if using their 100x100 variant
                            iconAnchor: [25, 25],
                            popupAnchor: [0, -25]
                        });
                        const popupContent = `<b>${station.name}</b><br>${station.main.temp}°C, ${station.weather[0].description}`;
                        L.marker([station.coord.Lat, station.coord.Lon], { icon: weatherIcon })
                            .bindPopup(popupContent)
                            .addTo(weatherLayer);
                    } else {
                        console.warn('Skipping weather station due to missing data:', station);
                    }
                });
            } else {
                console.log('No weather stations found for the current view.');
                // Optionally, add a message to the layer: L.popup().setLatLng(map.getCenter()).setContent("No weather stations found here.").openOn(weatherLayer);
            }
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            alert(`Could not fetch weather data: ${error.message}`);
            // Do not uncheck the toggle automatically, user might want to try again by moving map
            // weatherLayer.clearLayers();
            // if (weatherToggle) weatherToggle.checked = false;
        });
}

const weatherToggle = document.getElementById('weatherToggle'); // Define once outside if not already
if (weatherToggle && !weatherToggle.disabled) { // Only add listener if not disabled
    weatherToggle.addEventListener('change', () => {
        if (weatherToggle.checked) {
            if (!map.hasLayer(weatherLayer)) { // Add to map if not already present
                weatherLayer.addTo(map);
            }
            updateWeather();
        } else {
            weatherLayer.clearLayers();
            if (map.hasLayer(weatherLayer)) { // Remove from map
                map.removeLayer(weatherLayer);
            }
        }
    });
}

map.on('moveend', () => {
    const weatherToggle = document.getElementById('weatherToggle'); // Get fresh reference
    if (weatherToggle && weatherToggle.checked && !weatherToggle.disabled) {
        updateWeather();
    }
    const gasPriceToggle = document.getElementById('gasPriceToggle'); // Get fresh reference
    if (gasPriceToggle && gasPriceToggle.checked) {
        updateGasPrices();
    }
});

// Gas Price Layer Functionality (Placeholder)
const gasPriceToggle = document.getElementById('gasPriceToggle');

function updateGasPrices() {
    const gasPriceToggle = document.getElementById('gasPriceToggle'); // Get fresh reference

    if (!gasPriceToggle || !gasPriceToggle.checked) {
        gasPriceLayer.clearLayers();
        if (map.hasLayer(gasPriceLayer)) { // Only remove if it was added
            map.removeLayer(gasPriceLayer);
        }
        return;
    }

    // --- GAS PRICE API INTEGRATION NEEDED ---
    // TODO: Replace the following placeholder with actual gas price API integration.
    //       You will need to find a suitable API, get an API key (if required),
    //       and then fetch and display the data similarly to the weather layer.
    console.warn('updateGasPrices called. Gas price API integration is PENDING.');
    alert('Gas Price Layer: API integration is needed. Displaying placeholder data. See console for details.');

    gasPriceLayer.clearLayers(); // Clear previous example markers

    // Placeholder: Add a few sample markers if map center is available
    if (map.getCenter()) {
        const center = map.getCenter();
        L.marker(center)
            .bindPopup('Sample Gas Station (Central)<br>Price: $X.XX')
            .addTo(gasPriceLayer);

        // Add a couple more around the center for visual variety
        L.marker([center.lat + 0.005, center.lng - 0.005])
            .bindPopup('Sample Gas Station (SW)<br>Price: $Y.YY')
            .addTo(gasPriceLayer);
        L.marker([center.lat - 0.005, center.lng + 0.005])
            .bindPopup('Sample Gas Station (NE)<br>Price: $Z.ZZ')
            .addTo(gasPriceLayer);
    } else {
        console.log("Map center not available for gas price placeholders.");
    }
    // --- END OF PLACEHOLDER ---
}

const gasPriceToggle = document.getElementById('gasPriceToggle'); // Define once outside
if (gasPriceToggle) {
    gasPriceToggle.addEventListener('change', () => {
        if (gasPriceToggle.checked) {
            if (!map.hasLayer(gasPriceLayer)) { // Add to map if not already present
                gasPriceLayer.addTo(map);
            }
            updateGasPrices();
        } else {
            gasPriceLayer.clearLayers();
            if (map.hasLayer(gasPriceLayer)) { // Remove from map
                map.removeLayer(gasPriceLayer);
            }
        }
    });
}


// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
