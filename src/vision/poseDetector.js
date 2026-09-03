import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let poseLandmarkerInstance = null;

/**
 * Initializes the MediaPipe Pose Landmarker using official CDN assets.
 */
export async function initPoseLandmarker() {
  if (poseLandmarkerInstance) {
    return poseLandmarkerInstance;
  }

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  return poseLandmarkerInstance;
}

/**
 * Runs real-time pose landmarker detection on a video frame.
 */
export function detectPose(videoElement, timestamp) {
  if (!poseLandmarkerInstance || !videoElement || videoElement.readyState < 2) {
    return null;
  }

  try {
    return poseLandmarkerInstance.detectForVideo(videoElement, timestamp);
  } catch (error) {
    console.error('Pose landmarker detection error:', error);
    return null;
  }
}

/**
 * MediaPipe Foot Landmark indices:
 * 27: LEFT_ANKLE
 * 28: RIGHT_ANKLE
 * 29: LEFT_HEEL
 * 30: RIGHT_HEEL
 * 31: LEFT_FOOT_INDEX
 * 32: RIGHT_FOOT_INDEX
 */
export const FOOT_LANDMARK_INDICES = [
  { id: 27, name: 'L. Ankle', key: 'LEFT_ANKLE', color: '#06b6d4' },
  { id: 28, name: 'R. Ankle', key: 'RIGHT_ANKLE', color: '#a855f7' },
  { id: 29, name: 'L. Heel', key: 'LEFT_HEEL', color: '#06b6d4' },
  { id: 30, name: 'R. Heel', key: 'RIGHT_HEEL', color: '#a855f7' },
  { id: 31, name: 'L. Toe', key: 'LEFT_FOOT_INDEX', color: '#38bdf8' },
  { id: 32, name: 'R. Toe', key: 'RIGHT_FOOT_INDEX', color: '#c084fc' },
];

/**
 * Extracts and returns normalized foot landmark objects.
 */
export function extractFootLandmarks(landmarks) {
  if (!landmarks || landmarks.length === 0 || !landmarks[0]) {
    return null;
  }

  const pose = landmarks[0];
  const footLandmarks = [];

  for (const item of FOOT_LANDMARK_INDICES) {
    const point = pose[item.id];
    if (point && (point.visibility === undefined || point.visibility > 0.3)) {
      footLandmarks.push({
        ...item,
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: point.visibility,
      });
    }
  }

  return footLandmarks;
}
