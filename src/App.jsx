import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraView from './components/CameraView';
import ControlPanel from './components/ControlPanel';
import { gestureEngine } from './gestures/gestureEngine';
import { spotifyController } from './spotify/spotifyController';
import { spotifyApi } from './spotify/spotifyApi';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(spotifyApi.isConnected());

  useEffect(() => {
    // Handle Spotify PKCE authorization callback if redirecting from Spotify OAuth
    spotifyApi.handleAuthCallback();

    // Register foot gesture listener: pass semantic gesture events to Spotify Controller
    gestureEngine.onGesture((event) => {
      spotifyController.handleGestureEvent(event);
    });

    // Sync Spotify connection status for Header indicator
    spotifyController.onStatusChange((status) => {
      setSpotifyConnected(status.isConnected);
    });
  }, []);

  const handleTelemetryUpdate = useCallback((data) => {
    setTelemetry(data);
  }, []);

  return (
    <div className="app-container">
      <Header
        cameraConnected={true}
        poseReady={true}
        spotifyConnected={spotifyConnected}
      />
      <main className="main-grid">
        <CameraView onTelemetryUpdate={handleTelemetryUpdate} telemetry={telemetry} />
        <ControlPanel telemetry={telemetry} />
      </main>
    </div>
  );
}

