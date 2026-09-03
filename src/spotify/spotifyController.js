import { spotifyApi } from './spotifyApi';
import { GESTURES } from '../gestures/gestureTypes';

/**
 * SpotifyController: Bridges semantic gesture events and manual UI triggers to Spotify Web API operations.
 */
export class SpotifyController {
  constructor(api = spotifyApi) {
    this.api = api;
    this.lastProcessedTimestamp = 0;
    this.statusMessage = 'Connect Spotify to use music controls.';
    this.lastAction = null;
    this.listeners = [];
  }

  /**
   * Subscribe to controller status updates
   */
  onStatusChange(callback) {
    this.listeners.push(callback);
    // Immediately notify initial state
    callback(this.getStatusState());
  }

  notifyListeners() {
    const state = this.getStatusState();
    this.listeners.forEach((fn) => fn(state));
  }

  getStatusState() {
    return {
      isConnected: this.api.isConnected(),
      statusMessage: this.statusMessage,
      lastAction: this.lastAction,
      clientId: this.api.getClientId(),
    };
  }

  /**
   * Primary entry point for semantic gesture events from GestureEngine.
   * @param {Object} gestureEvent - { type, confidence, timestamp }
   */
  async handleGestureEvent(gestureEvent) {
    if (!gestureEvent || !gestureEvent.type || gestureEvent.type === GESTURES.NONE) {
      return;
    }

    // Deduplication check: prevent multiple execution of the exact same event
    if (gestureEvent.timestamp && gestureEvent.timestamp === this.lastProcessedTimestamp) {
      return;
    }

    this.lastProcessedTimestamp = gestureEvent.timestamp || Date.now();

    // Check Spotify Connection Status
    if (!this.api.isConnected()) {
      this.statusMessage = 'Connect Spotify to use music controls.';
      this.lastAction = {
        type: gestureEvent.type,
        status: 'disconnected_notice',
        time: Date.now(),
      };
      this.notifyListeners();
      console.warn(`Gesture ${gestureEvent.type} received, but Spotify is disconnected.`);
      return;
    }

    // Map gesture type to Spotify API operation
    await this.executeCommand(gestureEvent.type, 'Gesture');
  }

  /**
   * Execute playback action manually or via gesture.
   */
  async executeCommand(actionType, source = 'Manual') {
    if (!this.api.isConnected()) {
      this.statusMessage = 'Connect Spotify to use music controls.';
      this.lastAction = {
        type: actionType,
        status: 'disconnected_notice',
        time: Date.now(),
      };
      this.notifyListeners();
      return;
    }

    this.statusMessage = `Executing ${actionType} (${source})...`;
    this.notifyListeners();

    let result;

    switch (actionType) {
      case GESTURES.NEXT:
      case 'NEXT':
      case 'RIGHT':
        result = await this.api.next();
        break;

      case GESTURES.PREVIOUS:
      case 'PREVIOUS':
      case 'LEFT':
        result = await this.api.previous();
        break;

      case GESTURES.PLAY:
      case 'PLAY':
      case 'FORWARD':
        result = await this.api.play();
        break;

      case GESTURES.PAUSE:
      case 'PAUSE':
      case 'BACKWARD':
        result = await this.api.pause();
        break;

      default:
        console.warn(`Unknown Spotify action type: ${actionType}`);
        return;
    }

    if (result && result.success) {
      this.statusMessage = `Successfully executed ${actionType}!`;
      this.lastAction = { type: actionType, status: 'success', source, time: Date.now() };
    } else {
      const errMsg = result?.message || 'Playback command failed. Ensure an active Spotify player device is open.';
      this.statusMessage = errMsg;
      this.lastAction = { type: actionType, status: 'error', message: errMsg, source, time: Date.now() };
    }

    this.notifyListeners();
  }
}

export const spotifyController = new SpotifyController();
