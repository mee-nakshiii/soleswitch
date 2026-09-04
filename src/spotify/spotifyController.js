/**
 * Spotify Semantic Event Adapter (spotifyController.js)
 *
 * Sits strictly between the Gesture Recognition Engine and the Spotify API.
 * Receives high-level semantic events and translates them into appropriate Spotify API calls.
 *
 * Flow:
 *   gestureEngine -> semantic event -> spotifyController -> spotifyApi -> Spotify Web API
 */

import * as spotifyApi from './spotifyApi.js';

// Keep a local cached volume to make rapid VOLUME_UP / VOLUME_DOWN responsive
let cachedVolume = 50;
const VOLUME_STEP = 10;

// Iconic Michael Jackson track for the MOONWALK gesture
const MOONWALK_TRACK_URI = 'spotify:track:5ChkMS8OtdzsqVrYb6objn'; // Billie Jean

const eventListeners = new Set();

/**
 * Register a listener to observe semantic events and their execution outcomes.
 */
export function addEventListener(listener) {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

function notifyListeners(event, result) {
  eventListeners.forEach((listener) => {
    try {
      listener(event, result);
    } catch (e) {
      console.error('Error in semantic event listener:', e);
    }
  });
}

/**
 * Updates the cached volume level (called when playback state is polled).
 */
export function updateCachedVolume(volume) {
  if (typeof volume === 'number' && !isNaN(volume)) {
    cachedVolume = Math.max(0, Math.min(100, Math.round(volume)));
  }
}

/**
 * Dispatches and executes a semantic gesture event.
 *
 * @param {Object} event - Semantic event object.
 * @param {string} event.type - One of: 'NEXT', 'PREVIOUS', 'PLAY', 'PAUSE', 'VOLUME_UP', 'VOLUME_DOWN', 'MOONWALK'.
 * @param {Object} [event.payload] - Optional metadata (e.g. deviceId, step, trackUri).
 * @returns {Promise<{ success: boolean, action: string, message: string, data?: any }>}
 */
export async function handleSemanticEvent(event) {
  if (!event || !event.type) {
    const errorResult = {
      success: false,
      action: 'UNKNOWN',
      message: 'Invalid semantic event received (missing event.type).',
    };
    notifyListeners(event, errorResult);
    return errorResult;
  }

  const type = event.type.toUpperCase();
  const deviceId = event.payload?.deviceId || null;

  try {
    let message = '';
    let data = null;

    switch (type) {
      case 'NEXT': {
        await spotifyApi.next(deviceId);
        message = 'Skipped to next track';
        break;
      }

      case 'PREVIOUS': {
        await spotifyApi.previous(deviceId);
        message = 'Skipped to previous track';
        break;
      }

      case 'PLAY': {
        await spotifyApi.play(deviceId);
        message = 'Resumed playback';
        break;
      }

      case 'PAUSE': {
        await spotifyApi.pause(deviceId);
        message = 'Paused playback';
        break;
      }

      case 'VOLUME_UP': {
        const step = event.payload?.step || VOLUME_STEP;
        cachedVolume = Math.min(100, cachedVolume + step);
        await spotifyApi.setVolume(cachedVolume, deviceId);
        message = `Volume increased to ${cachedVolume}%`;
        data = { volume: cachedVolume };
        break;
      }

      case 'VOLUME_DOWN': {
        const step = event.payload?.step || VOLUME_STEP;
        cachedVolume = Math.max(0, cachedVolume - step);
        await spotifyApi.setVolume(cachedVolume, deviceId);
        message = `Volume decreased to ${cachedVolume}%`;
        data = { volume: cachedVolume };
        break;
      }

      case 'MOONWALK': {
        // Special Easter Egg gesture: plays Billie Jean or rewinds track
        try {
          await spotifyApi.playTrack(MOONWALK_TRACK_URI, deviceId);
          message = '🕺 Moonwalk gesture activated! Playing Billie Jean!';
        } catch {
          // Fallback: seek to beginning of current track
          await spotifyApi.seek(0, deviceId);
          message = '🕺 Moonwalk gesture activated! Rewound track to start.';
        }
        break;
      }

      default: {
        const unknownResult = {
          success: false,
          action: type,
          message: `Unsupported semantic event type: "${type}"`,
        };
        notifyListeners(event, unknownResult);
        return unknownResult;
      }
    }

    const successResult = {
      success: true,
      action: type,
      message,
      data,
    };

    notifyListeners(event, successResult);
    return successResult;
  } catch (err) {
    const failureResult = {
      success: false,
      action: type,
      message: err.message || `Failed to execute ${type}`,
      error: err,
    };

    notifyListeners(event, failureResult);
    return failureResult;
  }
}

/**
 * Convenient alias for handleSemanticEvent to allow dispatching from UI or engine.
 */
export const dispatchSemanticEvent = handleSemanticEvent;

export default {
  handleSemanticEvent,
  dispatchSemanticEvent,
  addEventListener,
  updateCachedVolume,
};
