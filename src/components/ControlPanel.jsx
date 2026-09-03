import React from 'react';

export default function ControlPanel() {
  const targetGestures = [
    { direction: 'LEFT', action: 'Previous Track' },
    { direction: 'RIGHT', action: 'Next Track' },
    { direction: 'FORWARD', action: 'Play / Resume' },
    { direction: 'BACKWARD', action: 'Pause' },
  ];

  return (
    <div className="card">
      <div className="card-title">
        <span>Target Gesture Mappings</span>
      </div>
      <div className="gesture-grid">
        {targetGestures.map((g) => (
          <div key={g.direction} className="gesture-item">
            <div className="key">{g.direction}</div>
            <div className="action">{g.action}</div>
          </div>
        ))}
      </div>
      <div className="spotify-status">
        <strong>Spotify Web API Controller:</strong> Standby (Authentication and playback control will be initialized in upcoming modules).
      </div>
    </div>
  );
}
