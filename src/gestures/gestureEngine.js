import { GESTURE_CONFIG, GESTURES } from './gestureTypes';

/**
 * Stateful Gesture Engine for SoleSwitch.
 * Converts MediaPipe foot landmark coordinates into semantic gesture events.
 * Supports hold-to-repeat for NEXT and PREVIOUS gestures while keeping PLAY and PAUSE single-fire.
 */
export class GestureEngine {
  constructor(config = GESTURE_CONFIG) {
    this.config = config;
    this.history = [];
    this.lastFiredTime = 0;
    this.lastFiredEvent = null;
    this.candidateGesture = GESTURES.NONE;
    this.candidateCount = 0;
    this.activeRepeatGesture = null;
    this.lastRepeatFiredTime = 0;
    this.listeners = [];
  }

  /**
   * Register listener for gesture events.
   */
  onGesture(callback) {
    this.listeners.push(callback);
  }

  /**
   * Process incoming MediaPipe pose landmark results.
   * @param {Array} landmarks - Raw MediaPipe pose landmarks array.
   * @returns {Object} Debug telemetry state.
   */
  processLandmarks(landmarks) {
    const now = Date.now();
    const isCooldownActive = now - this.lastFiredTime < this.config.GESTURE_COOLDOWN_MS;
    const cooldownRemainingMs = Math.max(0, this.config.GESTURE_COOLDOWN_MS - (now - this.lastFiredTime));

    if (!landmarks || landmarks.length === 0 || !landmarks[0]) {
      this.history = [];
      this.candidateGesture = GESTURES.NONE;
      this.candidateCount = 0;
      this.activeRepeatGesture = null;
      this.lastRepeatFiredTime = 0;

      return {
        currentGesture: GESTURES.NONE,
        confidence: 0,
        lastEvent: this.lastFiredEvent,
        cooldownActive: isCooldownActive,
        cooldownRemainingMs,
        isRepeatActive: false,
        repeatGesture: null,
        timeUntilNextRepeatMs: 0,
        telemetry: { dx: 0, dy: 0, magnitude: 0 },
      };
    }

    const pose = landmarks[0];

    // Extract key foot points (Indices 27-32)
    const leftAnkle = pose[27];
    const rightAnkle = pose[28];
    const leftHeel = pose[29];
    const rightHeel = pose[30];
    const leftToe = pose[31];
    const rightToe = pose[32];

    // Calculate center of feet
    const validPoints = [leftAnkle, rightAnkle, leftHeel, rightHeel, leftToe, rightToe].filter(
      (p) => p && (p.visibility === undefined || p.visibility > 0.3)
    );

    if (validPoints.length === 0) {
      this.activeRepeatGesture = null;
      this.lastRepeatFiredTime = 0;

      return {
        currentGesture: GESTURES.NONE,
        confidence: 0,
        lastEvent: this.lastFiredEvent,
        cooldownActive: isCooldownActive,
        cooldownRemainingMs,
        isRepeatActive: false,
        repeatGesture: null,
        timeUntilNextRepeatMs: 0,
        telemetry: { dx: 0, dy: 0, magnitude: 0 },
      };
    }

    const avgX = validPoints.reduce((sum, p) => sum + p.x, 0) / validPoints.length;
    const avgY = validPoints.reduce((sum, p) => sum + p.y, 0) / validPoints.length;

    // Push snapshot to history
    this.history.push({ timestamp: now, x: avgX, y: avgY });

    if (this.history.length > this.config.HISTORY_LENGTH) {
      this.history.shift();
    }

    if (this.history.length < 3) {
      return {
        currentGesture: GESTURES.NONE,
        confidence: 0,
        lastEvent: this.lastFiredEvent,
        cooldownActive: isCooldownActive,
        cooldownRemainingMs,
        isRepeatActive: false,
        repeatGesture: null,
        timeUntilNextRepeatMs: 0,
        telemetry: { dx: 0, dy: 0, magnitude: 0 },
      };
    }

    // Motion vector calculation comparing current frame to reference baseline
    const reference = this.history[0];
    const dx = avgX - reference.x;
    const dy = avgY - reference.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const magnitude = Math.sqrt(dx * dx + dy * dy);

    // Classify direction candidate
    let detectedCandidate = GESTURES.NONE;

    if (absDx > absDy) {
      // Invert horizontal interpretation to account for mirrored front-facing camera feed
      if (dx < -this.config.MOVEMENT_THRESHOLD_X) {
        detectedCandidate = GESTURES.NEXT; // Physical RIGHT movement -> NEXT
      } else if (dx > this.config.MOVEMENT_THRESHOLD_X) {
        detectedCandidate = GESTURES.PREVIOUS; // Physical LEFT movement -> PREVIOUS
      }
    } else {
      if (dy > this.config.MOVEMENT_THRESHOLD_Y) {
        detectedCandidate = GESTURES.PLAY; // Moving forward towards camera (y increases) -> PLAY
      } else if (dy < -this.config.MOVEMENT_THRESHOLD_Y) {
        detectedCandidate = GESTURES.PAUSE; // Moving backward away from camera (y decreases) -> PAUSE
      }
    }

    // Reset repeat state if candidate changes or returns to neutral
    if (detectedCandidate !== GESTURES.NEXT && detectedCandidate !== GESTURES.PREVIOUS) {
      this.activeRepeatGesture = null;
      this.lastRepeatFiredTime = 0;
    }

    // Stability check: consecutive frames matching candidate
    if (detectedCandidate !== GESTURES.NONE && detectedCandidate === this.candidateGesture) {
      this.candidateCount += 1;
    } else {
      this.candidateGesture = detectedCandidate;
      this.candidateCount = 1;
    }

    // Calculate confidence score (0.0 to 1.0)
    let rawThreshold = absDx > absDy ? this.config.MOVEMENT_THRESHOLD_X : this.config.MOVEMENT_THRESHOLD_Y;
    let confidence = 0;

    if (detectedCandidate !== GESTURES.NONE) {
      const ratio = Math.max(absDx, absDy) / rawThreshold;
      confidence = Math.min(1.0, Math.max(0.4, 0.5 + (ratio - 1.0) * 0.3));
    }

    const isStable = this.candidateCount >= this.config.STABILITY_FRAMES;
    const isConfident = confidence >= this.config.MIN_CONFIDENCE;

    // 1. Initial Trigger
    if (
      detectedCandidate !== GESTURES.NONE &&
      isStable &&
      isConfident &&
      !isCooldownActive
    ) {
      const gestureEvent = {
        type: detectedCandidate,
        confidence: Number(confidence.toFixed(2)),
        timestamp: now,
        isRepeat: false,
        details: { dx: Number(dx.toFixed(3)), dy: Number(dy.toFixed(3)) },
      };

      this.lastFiredTime = now;
      this.lastFiredEvent = gestureEvent;
      this.history = []; // Reset history after trigger to avoid immediate false frames
      this.candidateCount = 0;

      if (detectedCandidate === GESTURES.NEXT || detectedCandidate === GESTURES.PREVIOUS) {
        this.activeRepeatGesture = detectedCandidate;
        this.lastRepeatFiredTime = now;
      } else {
        this.activeRepeatGesture = null;
        this.lastRepeatFiredTime = 0;
      }

      // Notify listeners
      this.listeners.forEach((fn) => fn(gestureEvent));
    }
    // 2. Hold-to-Repeat Trigger for NEXT and PREVIOUS
    else if (
      this.activeRepeatGesture &&
      this.activeRepeatGesture === detectedCandidate &&
      now - this.lastRepeatFiredTime >= this.config.DIRECTION_REPEAT_INTERVAL_MS
    ) {
      const gestureEvent = {
        type: detectedCandidate,
        confidence: Number(confidence.toFixed(2)),
        timestamp: now,
        isRepeat: true,
        details: { dx: Number(dx.toFixed(3)), dy: Number(dy.toFixed(3)) },
      };

      this.lastRepeatFiredTime = now;
      this.lastFiredEvent = gestureEvent;

      // Notify listeners
      this.listeners.forEach((fn) => fn(gestureEvent));
    }

    const isRepeatActive = !!this.activeRepeatGesture;
    const timeUntilNextRepeatMs = isRepeatActive
      ? Math.max(0, this.config.DIRECTION_REPEAT_INTERVAL_MS - (now - this.lastRepeatFiredTime))
      : 0;

    return {
      currentGesture: this.candidateGesture,
      confidence: Number(confidence.toFixed(2)),
      lastEvent: this.lastFiredEvent,
      cooldownActive: isCooldownActive,
      cooldownRemainingMs,
      isRepeatActive,
      repeatGesture: this.activeRepeatGesture,
      timeUntilNextRepeatMs,
      telemetry: {
        dx: Number(dx.toFixed(3)),
        dy: Number(dy.toFixed(3)),
        magnitude: Number(magnitude.toFixed(3)),
      },
    };
  }
}

// Singleton instance helper
export const gestureEngine = new GestureEngine();
