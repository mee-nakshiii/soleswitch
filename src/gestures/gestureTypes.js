/**
 * Configurable thresholds and parameters for the SoleSwitch Gesture Engine.
 * Easily tune these values near the top of the file.
 */
export const GESTURE_CONFIG = {
  // Minimum horizontal displacement (normalized screen ratio) for LEFT/RIGHT
  MOVEMENT_THRESHOLD_X: 0.05,

  // Minimum vertical displacement (normalized screen ratio) for FORWARD/BACKWARD
  MOVEMENT_THRESHOLD_Y: 0.05,

  // Cooldown duration in milliseconds after a gesture fires to prevent duplicates
  GESTURE_COOLDOWN_MS: 850,

  // Repeat interval in milliseconds when holding RIGHT (NEXT) or LEFT (PREVIOUS)
  DIRECTION_REPEAT_INTERVAL_MS: 1000,

  // Number of recent frames stored in rolling history
  HISTORY_LENGTH: 8,

  // Number of consecutive frames required in target direction for stability
  STABILITY_FRAMES: 3,

  // Minimum confidence threshold (0.0 to 1.0) required to emit an event
  MIN_CONFIDENCE: 0.60,
};

/**
 * Semantic Gesture Event Constants
 */
export const GESTURES = {
  NONE: 'NONE',
  PREVIOUS: 'PREVIOUS', // Left foot movement
  NEXT: 'NEXT',         // Right foot movement
  PLAY: 'PLAY',         // Forward step
  PAUSE: 'PAUSE',       // Backward step
};
