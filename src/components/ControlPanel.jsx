import React from 'react';
import SpotifyPlayer from './SpotifyPlayer';

export default function ControlPanel() {
  const targetGestures = [
    { direction: 'LEFT', action: 'Previous Track (PREVIOUS)' },
    { direction: 'RIGHT', action: 'Next Track (NEXT)' },
    { direction: 'FORWARD', action: 'Play / Resume (PLAY)' },
    { direction: 'BACKWARD', action: 'Pause (PAUSE)' },
    { direction: 'STEP UP', action: 'Volume Up (VOLUME_UP)' },
    { direction: 'STEP DOWN', action: 'Volume Down (VOLUME_DOWN)' },
    { direction: 'MOONWALK', action: 'Easter Egg (MOONWALK)' },
  ];

  return (
    <div className="control-panel-stack">
      <div className="card">
        <div className="card-title">
          <span>Target Gesture Mappings</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>Event Flow Ready</span>
        </div>
        <div className="gesture-grid">
          {targetGestures.map((g) => (
            <div key={g.direction} className="gesture-item">
              <div className="key">{g.direction}</div>
              <div className="action">{g.action}</div>
            </div>
          ))}
        </div>
      </div>

      <SpotifyPlayer />
    </div>
  );
}
