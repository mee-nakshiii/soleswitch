import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraView from './components/CameraView';
import ControlPanel from './components/ControlPanel';
import { gestureEngine } from './gestures/gestureEngine';
import { spotifyController } from './spotify/spotifyController';
import { spotifyApi } from './spotify/spotifyApi';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    // Handle Spotify PKCE authorization callback if redirecting from Spotify OAuth
    spotifyApi.handleAuthCallback();

    // Register gesture listener: pass semantic gesture events to Spotify Controller
    gestureEngine.onGesture((event) => {
      spotifyController.handleGestureEvent(event);
    });
  }, []);

  const handleTelemetryUpdate = useCallback((data) => {
    setTelemetry(data);
  }, []);

  return (
    <div className="app-container">
      <Header />
      <main className="main-grid">
        <CameraView onTelemetryUpdate={handleTelemetryUpdate} />
        <ControlPanel telemetry={telemetry} />
      </main>
    </div>
  );
}
