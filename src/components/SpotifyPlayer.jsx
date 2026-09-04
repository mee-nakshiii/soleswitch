import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  loginWithSpotify,
  handleAuthCallback,
  logout,
  isAuthenticated,
  getClientId,
  setClientId,
} from '../spotify/spotifyAuth.js';
import * as spotifyApi from '../spotify/spotifyApi.js';
import { handleSemanticEvent, updateCachedVolume } from '../spotify/spotifyController.js';

export default function SpotifyPlayer() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [clientIdInput, setClientIdInput] = useState(getClientId());
  const [showConfig, setShowConfig] = useState(!getClientId());
  const [playback, setPlayback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastEventFeedback, setLastEventFeedback] = useState(null);
  const [customVolume, setCustomVolume] = useState(50);
  const pollIntervalRef = useRef(null);

  // Check auth callback on mount
  useEffect(() => {
    async function checkCallback() {
      if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
        setLoading(true);
        const result = await handleAuthCallback();
        setLoading(false);
        if (result.success) {
          setAuthed(true);
          setErrorMsg('');
        } else if (result.error) {
          setErrorMsg(result.error);
        }
      }
    }
    checkCallback();
  }, []);

  // Fetch current playback state
  const refreshPlayback = useCallback(async () => {
    if (!isAuthenticated()) {
      setAuthed(false);
      return;
    }

    try {
      const state = await spotifyApi.getCurrentPlaybackState();
      setPlayback(state);
      if (state) {
        if (typeof state.volumePercent === 'number') {
          setCustomVolume(state.volumePercent);
          updateCachedVolume(state.volumePercent);
        }
        setErrorMsg('');
      } else {
        // No active playback / device idle
      }
    } catch (err) {
      if (err.message.includes('expired')) {
        setAuthed(false);
      }
      setErrorMsg(err.message);
    }
  }, []);

  // Poll playback state when authenticated
  useEffect(() => {
    if (authed) {
      refreshPlayback();
      pollIntervalRef.current = setInterval(refreshPlayback, 3000);
    } else {
      setPlayback(null);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [authed, refreshPlayback]);

  // Handle Login Click
  const handleConnect = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (clientIdInput) {
        setClientId(clientIdInput);
      }
      await loginWithSpotify(clientIdInput);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Handle Logout Click
  const handleDisconnect = () => {
    logout();
    setAuthed(false);
    setPlayback(null);
    setErrorMsg('');
    setLastEventFeedback(null);
  };

  // Dispatch Semantic Event (Simulating the gesture engine pipeline)
  const triggerGestureEvent = async (eventType, payload = {}) => {
    setLoading(true);
    const result = await handleSemanticEvent({ type: eventType, payload });
    setLoading(false);

    setLastEventFeedback({
      type: eventType,
      success: result.success,
      message: result.message,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (!result.success) {
      setErrorMsg(result.message);
    } else {
      setErrorMsg('');
      // Give Spotify a brief moment to process state change, then refresh UI
      setTimeout(refreshPlayback, 500);
    }
  };

  // Volume Slider Change
  const handleVolumeSliderChange = async (e) => {
    const val = parseInt(e.target.value, 10);
    setCustomVolume(val);
    updateCachedVolume(val);
    try {
      await spotifyApi.setVolume(val);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="card spotify-card">
      <div className="card-title">
        <div className="spotify-title-group">
          <svg className="spotify-logo" viewBox="0 0 24 24" width="24" height="24" fill="#1db954">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.307c-.216.353-.674.464-1.027.248-2.812-1.718-6.35-2.107-10.52-1.155-.403.092-.808-.16-.9-.564-.092-.403.16-.808.564-.9 4.567-1.042 8.483-.604 11.636 1.343.353.216.464.674.247 1.028zm1.468-3.264c-.272.443-.852.585-1.295.313-3.22-1.978-8.127-2.55-11.936-1.393-.497.15-1.026-.134-1.176-.632-.15-.498.134-1.026.632-1.176 4.356-1.322 9.774-.683 13.462 1.583.443.272.585.852.313 1.305zm.126-3.41c-3.86-2.292-10.228-2.503-13.908-1.386-.59.18-1.222-.153-1.402-.744-.18-.591.153-1.222.744-1.402 4.23-1.284 11.26-1.038 15.698 1.596.53.315.703 1.002.388 1.532-.315.53-1.002.703-1.52.404z" />
          </svg>
          <span>Spotify Controller</span>
        </div>
        <div className="spotify-status-badge">
          {authed ? (
            <span className="badge connected">
              <span className="dot active"></span> Connected
            </span>
          ) : (
            <span className="badge disconnected">
              <span className="dot"></span> Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Error / Alert banner */}
      {errorMsg && (
        <div className="alert-box alert-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Auth state: Not Connected */}
      {!authed ? (
        <div className="spotify-auth-section">
          <p className="auth-desc">
            Connect your Spotify account using PKCE OAuth to enable contactless gesture control.
          </p>

          {showConfig && (
            <div className="client-id-config">
              <label htmlFor="spotify-client-id">Spotify Client ID</label>
              <div className="input-group">
                <input
                  id="spotify-client-id"
                  type="text"
                  placeholder="Paste your Spotify Client ID..."
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="text-input"
                />
              </div>
              <small className="hint-text">
                Found in Spotify Developer Dashboard &rarr; Your App &rarr; Settings.
              </small>
            </div>
          )}

          <div className="auth-btn-row">
            <button
              id="spotify-connect-btn"
              onClick={handleConnect}
              disabled={loading || !clientIdInput}
              className="btn btn-spotify"
            >
              {loading ? 'Connecting...' : 'Connect with Spotify'}
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="btn btn-secondary btn-sm"
              title="Toggle Client ID configuration"
            >
              ⚙️ {showConfig ? 'Hide Config' : 'Configure Client ID'}
            </button>
          </div>
        </div>
      ) : (
        /* Auth state: Connected */
        <div className="spotify-player-section">
          {/* Now Playing View */}
          <div className="now-playing-container">
            {playback?.track ? (
              <div className="track-info-layout">
                {playback.track.albumArt ? (
                  <img
                    src={playback.track.albumArt}
                    alt={playback.track.album}
                    className="album-cover"
                  />
                ) : (
                  <div className="album-cover placeholder">🎵</div>
                )}
                <div className="track-details">
                  <div className="track-title" title={playback.track.name}>
                    {playback.track.name}
                  </div>
                  <div className="track-artist" title={playback.track.artists}>
                    {playback.track.artists}
                  </div>
                  {playback.track.album && (
                    <div className="track-album" title={playback.track.album}>
                      {playback.track.album}
                    </div>
                  )}
                  <div className="device-info">
                    <span className="device-icon">📱</span>
                    <span>{playback.device?.name || 'Active Player'}</span>
                    <span className={`playback-state-tag ${playback.isPlaying ? 'playing' : 'paused'}`}>
                      {playback.isPlaying ? 'Playing' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-active-player">
                <p>🎧 <strong>Spotify is ready</strong></p>
                <p className="subtext">
                  Open Spotify on your phone, desktop, or web and start playback to see track info here.
                </p>
              </div>
            )}
          </div>

          {/* Standard Playback Controls */}
          <div className="playback-controls-row">
            <button
              id="spotify-btn-prev"
              onClick={() => triggerGestureEvent('PREVIOUS')}
              className="ctrl-btn"
              title="Previous Track"
            >
              ⏮
            </button>
            <button
              id="spotify-btn-play-pause"
              onClick={() => triggerGestureEvent(playback?.isPlaying ? 'PAUSE' : 'PLAY')}
              className="ctrl-btn ctrl-btn-main"
              title={playback?.isPlaying ? 'Pause' : 'Play'}
            >
              {playback?.isPlaying ? '⏸' : '▶'}
            </button>
            <button
              id="spotify-btn-next"
              onClick={() => triggerGestureEvent('NEXT')}
              className="ctrl-btn"
              title="Next Track"
            >
              ⏭
            </button>
          </div>

          {/* Volume Control Bar */}
          <div className="volume-slider-group">
            <span className="vol-icon">🔉</span>
            <input
              type="range"
              min="0"
              max="100"
              value={customVolume}
              onChange={handleVolumeSliderChange}
              className="volume-slider"
              title={`Volume: ${customVolume}%`}
            />
            <span className="vol-icon">🔊</span>
            <span className="vol-percent">{customVolume}%</span>
          </div>

          {/* Task 5: Semantic Gesture Event Simulator */}
          <div className="gesture-simulator-section">
            <div className="simulator-header">
              <span>🎯 Semantic Gesture Event Simulator</span>
              <span className="sub-badge">Adapter Test</span>
            </div>
            <p className="simulator-desc">
              Test semantic events that will be dispatched by the vision & gesture engine.
            </p>
            <div className="gesture-btn-grid">
              <button
                id="btn-event-play"
                onClick={() => triggerGestureEvent('PLAY')}
                className="gesture-trigger-btn"
              >
                PLAY
              </button>
              <button
                id="btn-event-pause"
                onClick={() => triggerGestureEvent('PAUSE')}
                className="gesture-trigger-btn"
              >
                PAUSE
              </button>
              <button
                id="btn-event-next"
                onClick={() => triggerGestureEvent('NEXT')}
                className="gesture-trigger-btn"
              >
                NEXT
              </button>
              <button
                id="btn-event-prev"
                onClick={() => triggerGestureEvent('PREVIOUS')}
                className="gesture-trigger-btn"
              >
                PREVIOUS
              </button>
              <button
                id="btn-event-vol-up"
                onClick={() => triggerGestureEvent('VOLUME_UP')}
                className="gesture-trigger-btn"
              >
                VOLUME_UP (+10%)
              </button>
              <button
                id="btn-event-vol-down"
                onClick={() => triggerGestureEvent('VOLUME_DOWN')}
                className="gesture-trigger-btn"
              >
                VOLUME_DOWN (-10%)
              </button>
              <button
                id="btn-event-moonwalk"
                onClick={() => triggerGestureEvent('MOONWALK')}
                className="gesture-trigger-btn special"
                title="Plays Michael Jackson - Billie Jean"
              >
                🕺 MOONWALK
              </button>
            </div>

            {/* Last event execution status */}
            {lastEventFeedback && (
              <div
                className={`event-log ${
                  lastEventFeedback.success ? 'log-success' : 'log-error'
                }`}
              >
                <div className="log-badge">{lastEventFeedback.type}</div>
                <div className="log-text">{lastEventFeedback.message}</div>
                <div className="log-time">{lastEventFeedback.timestamp}</div>
              </div>
            )}
          </div>

          <div className="footer-action-row">
            <button
              id="spotify-disconnect-btn"
              onClick={handleDisconnect}
              className="btn btn-secondary btn-sm"
            >
              Disconnect Spotify
            </button>
            <button
              onClick={refreshPlayback}
              className="btn btn-ghost btn-sm"
              title="Refresh playback status"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
