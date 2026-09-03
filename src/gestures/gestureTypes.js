/**
 * Configurable thresholds and parameters for the SoleSwitch Gesture Engine.
 * Easily tune these values near the top of the file.
 */
export const GESTURE_CONFIG = {
  // Minimum horizontal displacement (normalized screen ratio) for LEFT/RIGHT
  MOVEMENT_THRESHOLD_X: 0.05,

  // Minimum vertical displacement (normalized screen ratio) for FORWARD/BACKWARD
  MOVEMENT_THRESHOLD_Y: 0.05,

  // Cooldown duration in milliseconds after a directional gesture fires
  GESTURE_COOLDOWN_MS: 850,

  // Repeat interval in milliseconds when holding RIGHT (NEXT) or LEFT (PREVIOUS)
  DIRECTION_REPEAT_INTERVAL_MS: 1000,

  // Configurable thresholds for Special Artist Poses
  POSE_MJ_DIFF_Y_THRESHOLD: 0.08,            // Left foot forward relative to right
  POSE_RICK_DIFF_Y_THRESHOLD: -0.08,          // Right foot forward relative to left
  POSE_BIEBER_STANCE_WIDTH_THRESHOLD: 0.16,   // Feet wide apart horizontally
  SPECIAL_POSE_STABILITY_FRAMES: 15,          // ~0.5 - 1.0s continuous pose hold
  SPECIAL_POSE_COOLDOWN_MS: 3000,             // 3-second cooldown before repeat trigger

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
  PREVIOUS: 'PREVIOUS',     // Left foot movement
  NEXT: 'NEXT',             // Right foot movement
  PLAY: 'PLAY',             // Forward step
  PAUSE: 'PAUSE',           // Backward step
  POSE_MJ: 'POSE_MJ',       // Left leg forward -> Michael Jackson
  POSE_RICK: 'POSE_RICK',   // Right leg forward -> Rick Astley
  POSE_BIEBER: 'POSE_BIEBER',// Wide stance -> Justin Bieber
};
