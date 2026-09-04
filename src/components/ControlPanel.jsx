import React, { useState, useEffect, useRef } from 'react';
import { GESTURES, GESTURE_CONFIG } from '../gestures/gestureTypes';
import { spotifyController } from '../spotify/spotifyController';
import { spotifyApi } from '../spotify/spotifyApi';

export default function ControlPanel({ telemetry }) {
  const [spotifyState, setSpotifyState] = useState({
    isConnected: false,
    statusMessage: 'Connect Spotify to start controlling music with your feet.',
    lastAction: null,
    clientId: spotifyApi.getClientId(),
  });

  const [inputClientId, setInputClientId] = useState(spotifyApi.getClientId());
  const [currentPlayback, setCurrentPlayback] = useState(null);
  const [activeFeedback, setActiveFeedback] = useState(null);
  const lastEventRef = useRef(null);

  useEffect(() => {
    // Subscribe to SpotifyController updates
    spotifyController.onStatusChange((newState) => {
      setSpotifyState(newState);
    });
  }, []);

  // Poll real Spotify current playback when connected
  useEffect(() => {
    if (!spotifyState.isConnected) {
      setCurrentPlayback(null);
      return;
    }

    const fetchPlayback = async () => {
      try {
        const res = await spotifyApi.getCurrentPlayback();
        if (res && res.success && res.data && res.data.item) {
          setCurrentPlayback({
            trackName: res.data.item.name,
            artistName: res.data.item.artists?.map((a) => a.name).join(', '),
            albumArt: res.data.item.album?.images?.[0]?.url,
            isPlaying: res.data.is_playing,
          });
        }
      } catch (err) {
        // Silent catch for polling
      }
    };

    fetchPlayback();
    const interval = setInterval(fetchPlayback, 3000);
    return () => clearInterval(interval);
  }, [spotifyState.isConnected, spotifyState.lastAction]);

  // Monitor gesture events for feedback overlay
  useEffect(() => {
    const lastEvent = telemetry?.lastEvent;
    if (lastEvent && lastEvent.timestamp !== lastEventRef.current) {
      lastEventRef.current = lastEvent.timestamp;
      let fb = null;
      switch (lastEvent.type) {
        case GESTURES.NEXT:
          fb = { title: 'NEXT TRACK', symbol: '→→' };
          break;
        case GESTURES.PREVIOUS:
          fb = { title: 'PREVIOUS TRACK', symbol: '←←' };
          break;
        case GESTURES.PLAY:
          fb = { title: 'PLAY', symbol: '▶' };
          break;
        case GESTURES.PAUSE:
          fb = { title: 'PAUSE', symbol: 'Ⅱ' };
          break;
        case GESTURES.POSE_MJ:
          fb = { title: 'BILLIE JEAN', symbol: 'POSE DETECTED' };
          break;
        case GESTURES.POSE_RICK:
          fb = { title: 'NEVER GONNA GIVE YOU UP', symbol: 'POSE DETECTED' };
          break;
        case GESTURES.POSE_BIEBER:
          fb = { title: 'BABY', symbol: 'POSE DETECTED' };
          break;
        default:
          break;
      }
      if (fb) {
        setActiveFeedback(fb);
        const timer = setTimeout(() => setActiveFeedback(null), 1800);
        return () => clearTimeout(timer);
      }
    }
  }, [telemetry?.lastEvent]);

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
    setCurrentPlayback(null);
  };

  const handleManualAction = (action) => {
    spotifyController.executeCommand(action, 'Manual Test Button');
  };

  const currentGesture = telemetry?.currentGesture || GESTURES.NONE;
  const confidencePercent = telemetry?.confidence ? Math.round(telemetry.confidence * 100) : 0;
  const lastEvent = telemetry?.lastEvent;
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

  const footControls = [
    {
      id: 'LEFT',
      gestureKey: GESTURES.PREVIOUS,
      arrowSymbol: '←',
      actionTitle: 'PREVIOUS',
      footLabel: 'Left Foot',
    },
    {
      id: 'RIGHT',
      gestureKey: GESTURES.NEXT,
      arrowSymbol: '→',
      actionTitle: 'NEXT',
      footLabel: 'Right Foot',
    },
    {
      id: 'FORWARD',
      gestureKey: GESTURES.PLAY,
      arrowSymbol: '↑',
      actionTitle: 'PLAY',
      footLabel: 'Step Forward',
    },
    {
      id: 'BACKWARD',
      gestureKey: GESTURES.PAUSE,
      arrowSymbol: '↓',
      actionTitle: 'PAUSE',
      footLabel: 'Step Back',
    },
  ];

  const specialPoses = [
    {
      id: 'MJ',
      gestureKey: GESTURES.POSE_MJ,
      title: 'Billie Jean',
      artist: 'Michael Jackson',
      icon: '🕺',
      stance: 'Left Leg Forward + Right Leg Back',
    },
    {
      id: 'RICK',
      gestureKey: GESTURES.POSE_RICK,
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      icon: '🎤',
      stance: 'Right Leg Forward + Left Leg Back',
    },
    {
      id: 'BIEBER',
      gestureKey: GESTURES.POSE_BIEBER,
      title: 'Baby',
      artist: 'Justin Bieber',
      icon: '🎵',
      stance: 'Wide Stance',
    },
  ];

  return (
    <div className="card control-card">
      {/* Prominent Temporary Gesture Feedback Overlay */}
      {activeFeedback && (
        <div className="gesture-feedback-toast animate-aqua-toast">
          <span className="toast-symbol">{activeFeedback.symbol}</span>
          <span className="toast-title">{activeFeedback.title}</span>
        </div>
      )}

      {/* NOW PLAYING MUSIC PLAYER PANEL */}
      <div className="now-playing-panel">
        <div className="panel-header">
          <span className="section-badge">NOW PLAYING</span>
          {spotifyState.isConnected ? (
            <span className="spotify-status-connected">● Spotify Connected</span>
          ) : (
            <span className="spotify-status-disconnected">● Spotify Disconnected</span>
          )}
        </div>

        {spotifyState.isConnected ? (
          <div className="player-display">
            <div className="album-art-wrapper">
              {currentPlayback?.albumArt ? (
                <img
                  src={currentPlayback.albumArt}
                  alt="Album Art"
                  className={`album-cover ${currentPlayback.isPlaying ? 'spinning' : ''}`}
                />
              ) : (
                <div className="aqua-disc">
                  <div className="disc-center">🌊</div>
                </div>
              )}
            </div>
            <div className="track-info">
              <h2 className="track-title">
                {currentPlayback?.trackName || spotifyState.statusMessage || 'Connected to Spotify'}
              </h2>
              <p className="track-artist">
                {currentPlayback?.artistName || (currentPlayback ? 'Spotify Active' : 'Ready for foot gesture input')}
              </p>
              <div className="playback-status-msg">
                {spotifyState.statusMessage}
              </div>
            </div>
          </div>
        ) : (
          <div className="spotify-connect-box">
            <div className="connect-text-group">
              <p className="connect-headline">Connect Spotify Account</p>
              <p className="connect-sub">Enter Client ID to start controlling Spotify with your feet</p>
            </div>
            <form onSubmit={handleConnectSpotify} className="aqua-spotify-form">
              <input
                type="text"
                placeholder="Enter Spotify Client ID..."
                value={inputClientId}
                onChange={(e) => setInputClientId(e.target.value)}
                className="aqua-input-field"
              />
              <button type="submit" className="aqua-connect-btn">
                Connect Spotify
              </button>
            </form>
          </div>
        )}
      </div>

      {/* FOOT CONTROLLER SECTION */}
      <div className="controller-section">
        <div className="section-header-group">
          <h3 className="section-title-text">FOOT CONTROLLER</h3>
          <span className="section-subtitle">Move your feet. Control your music.</span>
        </div>

        <div className="foot-grid">
          {footControls.map((ctrl) => {
            const isActive = currentGesture === ctrl.gestureKey || lastEvent?.type === ctrl.gestureKey;
            return (
              <div
                key={ctrl.id}
                className={`foot-card ${isActive ? 'active-foot-card' : ''}`}
              >
                <div className="arrow-symbol">{ctrl.arrowSymbol}</div>
                <div className="action-title">{ctrl.actionTitle}</div>
                <div className="foot-label">{ctrl.footLabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POSE PLAYLIST SECTION */}
      <div className="controller-section">
        <div className="section-header-group">
          <h3 className="section-title-text">POSE PLAYLIST</h3>
          <span className="section-subtitle">Strike a pose. Start a song.</span>
        </div>

        <div className="pose-playlist-grid">
          {specialPoses.map((pose) => {
            const isActive =
              poseDebug.activeSpecialPose === pose.gestureKey ||
              lastEvent?.type === pose.gestureKey;
            return (
              <div
                key={pose.id}
                className={`pose-card ${isActive ? 'active-pose-card' : ''}`}
              >
                <div className="pose-emoji">{pose.icon}</div>
                <div className="pose-info">
                  <div className="pose-title">{pose.title}</div>
                  <div className="pose-artist">{pose.artist}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLLAPSED TESTING CONTROLS */}
      <details className="collapsible-section">
        <summary className="collapsible-header">Testing Controls ▸</summary>
        <div className="collapsible-content">
          <p className="debug-sub-title">Manual Controller Test Buttons</p>
          <div className="button-row-grid">
            <button className="manual-test-btn" onClick={() => handleManualAction(GESTURES.PREVIOUS)}>
              ⏮ Prev
            </button>
            <button className="manual-test-btn" onClick={() => handleManualAction(GESTURES.PLAY)}>
              ▶ Play
            </button>
            <button className="manual-test-btn" onClick={() => handleManualAction(GESTURES.PAUSE)}>
              ⏸ Pause
            </button>
            <button className="manual-test-btn" onClick={() => handleManualAction(GESTURES.NEXT)}>
              ⏭ Next
            </button>
            <button className="manual-test-btn" onClick={() => handleManualAction(GESTURES.POSE_MJ)}>
              🕺 MJ
            </button>
            <button className="manual-test-btn" onClick={() => handleManualAction(GESTURES.POSE_RICK)}>
              🎤 Rick
            </button>
            <button className="manual-test-btn" onClick={() => handleManualAction(GESTURES.POSE_BIEBER)}>
              🎵 Bieber
            </button>
          </div>
          {spotifyState.isConnected && (
            <div className="disconnect-row">
              <button className="disconnect-action-btn" onClick={handleDisconnect}>
                Disconnect Spotify Session
              </button>
            </div>
          )}
        </div>
      </details>

      {/* COLLAPSED DEVELOPER DIAGNOSTICS */}
      <details className="collapsible-section">
        <summary className="collapsible-header">Developer Diagnostics ▸</summary>
        <div className="collapsible-content">
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

          <div className="telemetry-row stance-debug">
            <span className="telemetry-label">🕺 Special Pose Debug:</span>
            <span className="telemetry-value">
              ΔY: <code>{poseDebug.diffY > 0 ? `+${poseDebug.diffY}` : poseDebug.diffY}</code> | Width: <code>{poseDebug.stanceWidth}</code> | Pose: <strong>{poseDebug.activeSpecialPose}</strong> ({poseDebug.poseStabilityCount}/{GESTURE_CONFIG.SPECIAL_POSE_STABILITY_FRAMES}) {poseDebug.specialPoseCooldownActive ? `[CD: ${poseDebug.specialPoseCooldownRemainingMs}ms]` : ''}
            </span>
          </div>

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

          <div className="config-hints">
            <small>
              <strong>Pose Thresholds (`gestureTypes.js`):</strong><br />
              MJ ΔY: <code>{GESTURE_CONFIG.POSE_MJ_DIFF_Y_THRESHOLD}</code> | Rick ΔY: <code>{GESTURE_CONFIG.POSE_RICK_DIFF_Y_THRESHOLD}</code> | Bieber Width: <code>{GESTURE_CONFIG.POSE_BIEBER_STANCE_WIDTH_THRESHOLD}</code> | Hold: <code>{GESTURE_CONFIG.SPECIAL_POSE_STABILITY_FRAMES} frames</code>
            </small>
          </div>
        </div>
      </details>
    </div>
  );
}
