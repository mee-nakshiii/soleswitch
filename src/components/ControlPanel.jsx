import React, { useState, useEffect } from 'react';
import { GESTURES, GESTURE_CONFIG } from '../gestures/gestureTypes';
import { spotifyController } from '../spotify/spotifyController';
import { spotifyApi } from '../spotify/spotifyApi';

export default function ControlPanel({ telemetry }) {
  const [spotifyState, setSpotifyState] = useState({
    isConnected: false,
    statusMessage: 'Connect Spotify to use music controls.',
    lastAction: null,
    clientId: spotifyApi.getClientId(),
  });

  const [inputClientId, setInputClientId] = useState(spotifyApi.getClientId());

  useEffect(() => {
    // Subscribe to SpotifyController updates
    spotifyController.onStatusChange((newState) => {
      setSpotifyState(newState);
    });
  }, []);

  const handleConnectSpotify = (e) => {
    e.preventDefault();
    if (!inputClientId.trim()) {
      alert('Please enter your Spotify Client ID to authenticate.');
      return;
    }
    spotifyApi.login(inputClientId);
  };

  const handleDisconnect = () => {
    spotifyApi.logout();
    setSpotifyState(spotifyController.getStatusState());
  };

  const handleManualAction = (action) => {
    spotifyController.executeCommand(action, 'Manual Test Button');
  };

  const targetGestures = [
    { key: GESTURES.PREVIOUS, direction: 'LEFT', action: 'Previous Track', icon: '⏮' },
    { key: GESTURES.NEXT, direction: 'RIGHT', action: 'Next Track', icon: '⏭' },
    { key: GESTURES.PLAY, direction: 'FORWARD', action: 'Play / Resume', icon: '▶' },
    { key: GESTURES.PAUSE, direction: 'BACKWARD', action: 'Pause', icon: '⏸' },
  ];

  const currentGesture = telemetry?.currentGesture || GESTURES.NONE;
  const confidencePercent = telemetry?.confidence ? Math.round(telemetry.confidence * 100) : 0;
  const lastEvent = telemetry?.lastEvent;
  const cooldownActive = telemetry?.cooldownActive;
  const cooldownMs = telemetry?.cooldownRemainingMs || 0;
  const delta = telemetry?.telemetry || { dx: 0, dy: 0, magnitude: 0 };

  return (
    <div className="card control-card">
      <div className="card-title">
        <span>Gesture & Spotify Control</span>
        <div className="status-pills">
          <span className={`status-pill ${cooldownActive ? 'pending' : 'online'}`}>
            {cooldownActive ? `Cooldown (${cooldownMs}ms)` : 'Engine Ready'}
          </span>
          <span className={`status-pill ${spotifyState.isConnected ? 'online' : 'offline'}`}>
            Spotify: {spotifyState.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Target Gestures Grid */}
      <div className="gesture-grid">
        {targetGestures.map((g) => {
          const isActive = currentGesture === g.key || lastEvent?.type === g.key;
          return (
            <div
              key={g.direction}
              className={`gesture-item ${isActive ? 'active-gesture' : ''}`}
            >
              <div className="key">{g.direction}</div>
              <div className="action">{g.icon} {g.action}</div>
            </div>
          );
        })}
      </div>

      {/* Live Gesture Telemetry Debug Display */}
      <div className="debug-telemetry-panel">
        <div className="telemetry-row main-state">
          <div>
            <span className="telemetry-label">Active Gesture:</span>
            <span className="telemetry-value active-badge">{currentGesture}</span>
          </div>
          <div>
            <span className="telemetry-label">Confidence:</span>
            <span className="telemetry-value">{confidencePercent}%</span>
          </div>
        </div>

        <div className="telemetry-row">
          <span className="telemetry-label">Last Fired Event:</span>
          <span className="telemetry-value highlight">
            {lastEvent ? `${lastEvent.type} (${Math.round(lastEvent.confidence * 100)}%)` : 'None'}
          </span>
        </div>

        {/* Detailed Vector Metrics */}
        <div className="debug-metrics-grid">
          <div className="metric-box">
            <span className="metric-title">ΔX (Horiz)</span>
            <span className="metric-val">{delta.dx > 0 ? `+${delta.dx}` : delta.dx}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">ΔY (Vert)</span>
            <span className="metric-val">{delta.dy > 0 ? `+${delta.dy}` : delta.dy}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Magnitude</span>
            <span className="metric-val">{delta.magnitude}</span>
          </div>
        </div>

        {/* Config Hints */}
        <div className="config-hints">
          <small>
            <strong>Tune Thresholds in `gestureTypes.js`:</strong><br />
            X Threshold: <code>{GESTURE_CONFIG.MOVEMENT_THRESHOLD_X}</code> | Y Threshold: <code>{GESTURE_CONFIG.MOVEMENT_THRESHOLD_Y}</code> | Cooldown: <code>{GESTURE_CONFIG.GESTURE_COOLDOWN_MS}ms</code>
          </small>
        </div>
      </div>

      {/* Spotify Integration Section */}
      <div className="spotify-integration-section">
        <div className="section-title">
          <span>Spotify Controller</span>
          {spotifyState.isConnected && (
            <button className="text-btn disconnect-btn" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
        </div>

        {!spotifyState.isConnected ? (
          <div className="spotify-connect-box">
            <p className="notice-banner">
              ⚠️ {spotifyState.statusMessage}
            </p>
            <form onSubmit={handleConnectSpotify} className="spotify-form">
              <input
                type="text"
                placeholder="Enter Spotify Client ID..."
                value={inputClientId}
                onChange={(e) => setInputClientId(e.target.value)}
                className="spotify-input"
              />
              <button type="submit" className="spotify-btn">
                Connect Spotify (PKCE)
              </button>
            </form>
          </div>
        ) : (
          <div className="spotify-active-box">
            <p className="status-msg">
              🟢 {spotifyState.statusMessage}
            </p>
          </div>
        )}

        {/* Manual Test Action Buttons */}
        <div className="manual-controls">
          <div className="manual-title">Manual Controller Test Buttons:</div>
          <div className="button-row">
            <button
              className="test-btn"
              onClick={() => handleManualAction(GESTURES.PREVIOUS)}
              title="Manual Trigger: PREVIOUS"
            >
              ⏮ Prev
            </button>
            <button
              className="test-btn"
              onClick={() => handleManualAction(GESTURES.PLAY)}
              title="Manual Trigger: PLAY"
            >
              ▶ Play
            </button>
            <button
              className="test-btn"
              onClick={() => handleManualAction(GESTURES.PAUSE)}
              title="Manual Trigger: PAUSE"
            >
              ⏸ Pause
            </button>
            <button
              className="test-btn"
              onClick={() => handleManualAction(GESTURES.NEXT)}
              title="Manual Trigger: NEXT"
            >
              ⏭ Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
