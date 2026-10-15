# progressive_app_map

An installable, offline-capable map app (PWA) built with [Leaflet](https://leafletjs.com/).
Originally scaffolded by Devin.ai and jules.google.com.

**Live:** https://dulani.github.io/progressive_app_map/

## Features

- **OpenStreetMap base map.** Tiles you've viewed are cached for offline use.
- **Center on my location**, with an accuracy circle.
- **GPX/KML routes.** Load a file, save it in the browser, and restore it later.
- **USPS blue boxes (mailboxes)** from OpenStreetMap via the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API). Turn on "Show Mailboxes" and zoom in to level 13 or closer. Popups show pickup times and the box ID where OSM has them. Areas you've already loaded keep working offline.
- **NEXRAD radar** (USA) from the Iowa State University IEM.
- **Weather overlays** (precipitation, clouds, temperature, wind) from OpenWeatherMap. These need your own free API key.

## Weather API key

Create a free account at [openweathermap.org](https://home.openweathermap.org/users/sign_up), copy your API key, paste it into the app and click **Save OWM Key**. New keys can take a few hours to activate.
The key is stored only in your browser's `localStorage` and is sent only to OpenWeatherMap.

## Running locally

There's no build step. Service workers only run over `https://` or `http://localhost`, not `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

After changing `service-worker.js`, bump the cache names at the top of the file (`shell-v2` → `shell-v3`) so browsers drop the old cache.

## Checks

CI runs both of these on every push and pull request:

```bash
npx eslint@10.12.0 .              # lint
node scripts/check-assets.mjs     # manifest/service worker reference files that exist, no absolute paths
```

## Data sources and limits

- **Mailboxes:** OpenStreetMap contributors (ODbL). Coverage varies by area. Boxes that aren't mapped won't appear, and you can [add them to OSM](https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dpost_box). The public Overpass servers are shared and sometimes overloaded, so the app tries three mirrors before giving up.
- **Tiles:** [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/). The app caches only tiles you've viewed and never bulk-downloads.
