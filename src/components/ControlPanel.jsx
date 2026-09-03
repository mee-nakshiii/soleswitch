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
    { key: GESTURES.PREVIOUS, direction: 'LEFT', action: 'Previous Track (Hold 🔄)', icon: '⏮' },
    { key: GESTURES.NEXT, direction: 'RIGHT', action: 'Next Track (Hold 🔄)', icon: '⏭' },
    { key: GESTURES.PLAY, direction: 'FORWARD', action: 'Play / Resume (1x)', icon: '▶' },
    { key: GESTURES.PAUSE, direction: 'BACKWARD', action: 'Pause (1x)', icon: '⏸' },
    { key: GESTURES.POSE_MJ, direction: 'L. LEG FWD', action: 'Michael Jackson Hit', icon: '🕺' },
    { key: GESTURES.POSE_RICK, direction: 'R. LEG FWD', action: 'Rick Astley - Never Gonna Give You Up', icon: '🎤' },
    { key: GESTURES.POSE_BIEBER, direction: 'WIDE STANCE', action: 'Justin Bieber - Baby', icon: '🎵' },
  ];

  const currentGesture = telemetry?.currentGesture || GESTURES.NONE;
  const confidencePercent = telemetry?.confidence ? Math.round(telemetry.confidence * 100) : 0;
  const lastEvent = telemetry?.lastEvent;
  const cooldownActive = telemetry?.cooldownActive;
  const cooldownMs = telemetry?.cooldownRemainingMs || 0;
  const isRepeatActive = telemetry?.isRepeatActive;
  const repeatGesture = telemetry?.repeatGesture;
  const timeUntilNextRepeatMs = telemetry?.timeUntilNextRepeatMs || 0;
  const delta = telemetry?.telemetry || { dx: 0, dy: 0, magnitude: 0 };
  const poseDebug = telemetry?.poseDebug || {
    leftFootY: 0,
    rightFootY: 0,
    diffY: 0,
    stanceWidth: 0,
    activeSpecialPose: GESTURES.NONE,
    poseStabilityCount: 0,
    specialPoseCooldownActive: false,
    specialPoseCooldownRemainingMs: 0,
  };

  return (
    <div className="card control-card">
      <div className="card-title">
        <span>Gesture & Spotify Control</span>
        <div className="status-pills">
          <span className={`status-pill ${cooldownActive ? 'pending' : 'online'}`}>
            {cooldownActive ? `Cooldown (${cooldownMs}ms)` : 'Engine Ready'}
          </span>
          <span className={`status-pill ${isRepeatActive ? 'pending' : 'online'}`}>
            Repeat: {isRepeatActive ? `${repeatGesture} (${timeUntilNextRepeatMs}ms)` : 'Inactive'}
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
            {lastEvent ? `${lastEvent.type} (${Math.round(lastEvent.confidence * 100)}%)${lastEvent.isRepeat ? ' 🔄 Repeat' : ''}` : 'None'}
          </span>
        </div>

        {/* Special Artist Pose Debug Section */}
        <div className="telemetry-row stance-debug">
          <span className="telemetry-label">🕺 Special Pose Debug:</span>
          <span className="telemetry-value">
            ΔY: <code>{poseDebug.diffY > 0 ? `+${poseDebug.diffY}` : poseDebug.diffY}</code> | Width: <code>{poseDebug.stanceWidth}</code> | Pose: <strong>{poseDebug.activeSpecialPose}</strong> ({poseDebug.poseStabilityCount}/{GESTURE_CONFIG.SPECIAL_POSE_STABILITY_FRAMES}) {poseDebug.specialPoseCooldownActive ? `[CD: ${poseDebug.specialPoseCooldownRemainingMs}ms]` : ''}
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
            <strong>Pose Thresholds (`gestureTypes.js`):</strong><br />
            MJ ΔY: <code>{GESTURE_CONFIG.POSE_MJ_DIFF_Y_THRESHOLD}</code> | Rick ΔY: <code>{GESTURE_CONFIG.POSE_RICK_DIFF_Y_THRESHOLD}</code> | Bieber Width: <code>{GESTURE_CONFIG.POSE_BIEBER_STANCE_WIDTH_THRESHOLD}</code> | Hold: <code>{GESTURE_CONFIG.SPECIAL_POSE_STABILITY_FRAMES} frames</code>
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
            <button
              className="test-btn"
              onClick={() => handleManualAction(GESTURES.POSE_MJ)}
              title="Manual Trigger: Michael Jackson"
            >
              🕺 MJ
            </button>
            <button
              className="test-btn"
              onClick={() => handleManualAction(GESTURES.POSE_RICK)}
              title="Manual Trigger: Rick Astley"
            >
              🎤 Rick
            </button>
            <button
              className="test-btn"
              onClick={() => handleManualAction(GESTURES.POSE_BIEBER)}
              title="Manual Trigger: Justin Bieber"
            >
              🎵 Bieber
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
