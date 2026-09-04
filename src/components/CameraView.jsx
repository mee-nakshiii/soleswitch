import React, { useEffect, useRef, useState } from 'react';
import {
  initPoseLandmarker,
  detectPose,
  extractFootLandmarks,
} from '../vision/poseDetector';
import { gestureEngine } from '../gestures/gestureEngine';

export default function CameraView({ onTelemetryUpdate, telemetry }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('Requesting camera access...');
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const [poseStatus, setPoseStatus] = useState('Initializing MediaPipe Pose...');
  const [poseReady, setPoseReady] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);

  const [activeHud, setActiveHud] = useState(null);
  const lastEventTimestampRef = useRef(null);

  // Monitor fired gesture events for overlay feedback
  useEffect(() => {
    const lastEvent = telemetry?.lastEvent;
    if (lastEvent && lastEvent.timestamp !== lastEventTimestampRef.current) {
      lastEventTimestampRef.current = lastEvent.timestamp;
      let hudData = null;

      switch (lastEvent.type) {
        case 'NEXT':
          hudData = { title: 'NEXT TRACK', symbol: '→→' };
          break;
        case 'PREVIOUS':
          hudData = { title: 'PREVIOUS TRACK', symbol: '←←' };
          break;
        case 'PLAY':
          hudData = { title: 'PLAY', symbol: '▶' };
          break;
        case 'PAUSE':
          hudData = { title: 'PAUSE', symbol: 'Ⅱ' };
          break;
        case 'POSE_MJ':
          hudData = { title: 'BILLIE JEAN', symbol: 'POSE DETECTED' };
          break;
        case 'POSE_RICK':
          hudData = { title: 'NEVER GONNA GIVE YOU UP', symbol: 'POSE DETECTED' };
          break;
        case 'POSE_BIEBER':
          hudData = { title: 'BABY', symbol: 'POSE DETECTED' };
          break;
        default:
          break;
      }

      if (hudData) {
        setActiveHud(hudData);
        const timer = setTimeout(() => {
          setActiveHud(null);
        }, 1800);
        return () => clearTimeout(timer);
      }
    }
  }, [telemetry?.lastEvent]);

  // Initialize MediaPipe Pose Landmarker
  useEffect(() => {
    let isMounted = true;

    initPoseLandmarker()
      .then(() => {
        if (isMounted) {
          setPoseStatus('Ready');
          setPoseReady(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load MediaPipe Pose Landmarker:', err);
        if (isMounted) {
          setPoseStatus('Error loading pose detector');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Request camera stream
  const startCamera = async () => {
    setCameraError(null);
    setCameraStatus('Requesting camera access...');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraConnected(true);
          setCameraStatus('Connected');
        };
      }
    } catch (err) {
      console.error('Camera stream error:', err);
      setCameraConnected(false);
      let errorMsg = 'Could not connect to camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission denied. Please allow access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found on this system.';
      }
      setCameraError(errorMsg);
      setCameraStatus('Permission / Device Error');
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Detection & Gesture Processing Loop
  useEffect(() => {
    if (!cameraConnected || !poseReady) return;

    let lastVideoTime = -1;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.currentTime !== lastVideoTime && video.readyState >= 2) {
        lastVideoTime = video.currentTime;
        const result = detectPose(video, performance.now());

        // Feed landmarks into Foot Gesture Engine (UNTOUCHED)
        const telemetry = gestureEngine.processLandmarks(result ? result.landmarks : null);
        if (onTelemetryUpdate) {
          onTelemetryUpdate(telemetry);
        }

        if (canvas) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (result && result.landmarks && result.landmarks.length > 0) {
            const footPoints = extractFootLandmarks(result.landmarks);

            if (footPoints && footPoints.length > 0) {
              setPoseDetected(true);
              drawFootMarkers(ctx, canvas, footPoints);
            } else {
              setPoseDetected(false);
            }
          } else {
            setPoseDetected(false);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraConnected, poseReady, onTelemetryUpdate]);

  // Canvas drawing function for foot landmarks
  const drawFootMarkers = (ctx, canvas, points) => {
    points.forEach((pt) => {
      const cx = pt.x * canvas.width;
      const cy = pt.y * canvas.height;

      // Outer glow circle
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
      ctx.fillStyle = pt.color + '40'; // transparent glow
      ctx.fill();

      // Core point circle
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = pt.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Label text
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(pt.name, cx + 12, cy + 4);
      ctx.shadowBlur = 0;
    });
  };

  return (
    <div className="card camera-card">
      <div className="card-header-bar">
        <div className="card-title-group">
          <span className="card-title">LIVE CAMERA</span>
          <span className="live-dot-pill">● LIVE</span>
        </div>
        <div className="status-pills">
          <span className={`status-pill ${cameraConnected ? 'online' : 'offline'}`}>
            ● {cameraConnected ? 'Camera Ready' : cameraStatus}
          </span>
          <span className={`status-pill ${poseReady ? 'online' : 'pending'}`}>
            ● {poseReady ? 'Pose Tracking' : poseStatus}
          </span>
        </div>
      </div>

      <div className="video-viewport">
        <video
          ref={videoRef}
          className="video-element"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="overlay-canvas" />

        {/* Temporary Gesture Detected HUD Overlay */}
        {activeHud && (
          <div className="gesture-hud-overlay animate-hud">
            <div className="hud-symbol">{activeHud.symbol}</div>
            <div className="hud-title">{activeHud.title}</div>
          </div>
        )}

        {!cameraConnected && !cameraError && (
          <div className="overlay-message">
            <div className="spinner"></div>
            <p>Initializing camera stream...</p>
          </div>
        )}

        {cameraError && (
          <div className="overlay-message error">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p>{cameraError}</p>
            <button className="retry-btn" onClick={startCamera}>
              Retry Camera Access
            </button>
          </div>
        )}

        {cameraConnected && poseReady && !poseDetected && !activeHud && (
          <div className="overlay-banner">
            <span>👣 Step into camera frame to trigger foot gestures</span>
          </div>
        )}
      </div>
    </div>
  );
}

