import React from 'react';
import { GESTURES, GESTURE_CONFIG } from '../gestures/gestureTypes';

export default function ControlPanel({ telemetry }) {
  const targetGestures = [
    { key: GESTURES.PREVIOUS, direction: 'LEFT', action: 'Previous Track' },
    { key: GESTURES.NEXT, direction: 'RIGHT', action: 'Next Track' },
    { key: GESTURES.PLAY, direction: 'FORWARD', action: 'Play / Resume' },
    { key: GESTURES.PAUSE, direction: 'BACKWARD', action: 'Pause' },
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
        <span>Gesture Engine Telemetry</span>
        <span className={`status-pill ${cooldownActive ? 'pending' : 'online'}`}>
          {cooldownActive ? `Cooldown (${cooldownMs}ms)` : 'Engine Ready'}
        </span>
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
              <div className="action">{g.action}</div>
            </div>
          );
        })}
      </div>

      {/* Live Gesture State Display */}
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

        {/* Detailed Debug Vectors */}
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

        {/* Tuneable Thresholds Note */}
        <div className="config-hints">
          <small>
            <strong>Tune Thresholds in `gestureTypes.js`:</strong><br />
            X Threshold: <code>{GESTURE_CONFIG.MOVEMENT_THRESHOLD_X}</code> | Y Threshold: <code>{GESTURE_CONFIG.MOVEMENT_THRESHOLD_Y}</code> | Cooldown: <code>{GESTURE_CONFIG.GESTURE_COOLDOWN_MS}ms</code>
          </small>
        </div>
      </div>
    </div>
  );
}
