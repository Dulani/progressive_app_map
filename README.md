# Progressive Map App

A progressive web application that displays an interactive map with user location tracking. Built with React, TypeScript, and Leaflet.

## Features

- Interactive OpenStreetMap integration
- Real-time user location tracking
- Progressive Web App (PWA) capabilities
- Mobile-responsive design

## Development

To run the development server:

```bash
npm install
npm run dev
```

The app will be available at http://localhost:5173

## Backend API

The backend is built with FastAPI. To run the backend server:

```bash
cd backend
poetry install
poetry run fastapi dev app/main.py
```

The API will be available at http://localhost:8000
