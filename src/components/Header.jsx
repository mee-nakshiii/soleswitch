import React from 'react';

export default function Header({ cameraConnected, poseReady, spotifyConnected }) {
  return (
    <header className="header-container">
      <div className="header-top">
        <div className="brand-group">
          <div className="brand-icon">
            <span className="icon-symbol">🌊</span>
            <span className="pulse-ring"></span>
          </div>
          <div className="brand-text">
            <h1 className="main-title">SoleSwitch</h1>
            <p className="main-tagline">Your feet. Your music. No hands.</p>
            <p className="sub-text">AI-powered contactless music control</p>
          </div>
        </div>

        <div className="header-status-group">
          <div className={`status-badge ${cameraConnected && poseReady ? 'online' : cameraConnected ? 'pending' : 'offline'}`}>
            <span className="status-dot"></span>
            <span>Camera: {cameraConnected ? (poseReady ? 'Ready' : 'Initializing') : 'Offline'}</span>
          </div>
          <div className={`status-badge ${spotifyConnected ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span>Spotify: {spotifyConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* 5-Second Concept Workflow Banner */}
      <div className="workflow-banner">
        <div className="workflow-step">
          <span className="step-icon">📷</span>
          <span className="step-text">CAMERA</span>
        </div>
        <span className="workflow-arrow">→</span>
        <div className="workflow-step">
          <span className="step-icon">✨</span>
          <span className="step-text">SEES YOUR MOVEMENT</span>
        </div>
        <span className="workflow-arrow">→</span>
        <div className="workflow-step">
          <span className="step-icon">👣</span>
          <span className="step-text">YOUR FEET CONTROL MUSIC</span>
        </div>
        <span className="workflow-arrow">→</span>
        <div className="workflow-step">
          <span className="step-icon">🎵</span>
          <span className="step-text">SPOTIFY RESPONDS</span>
        </div>
      </div>
    </header>
  );
}
