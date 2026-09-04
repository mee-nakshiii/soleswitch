import { spotifyApi } from './spotifyApi';
import { GESTURES } from '../gestures/gestureTypes';

/**
 * Source-of-truth Michael Jackson Spotify track URI.
 */
export const MICHAEL_JACKSON_TRACKS = [
  { name: 'Billie Jean', artist: 'Michael Jackson', uri: 'spotify:track:7J1uxwnxfQLu4APicE5Rnj' },
];

/**
 * Special Artist Tracks Mapping (Exact Source-of-Truth URIs)
 */
export const SPECIAL_ARTIST_TRACKS = {
  [GESTURES.POSE_RICK]: { name: 'Never Gonna Give You Up', artist: 'Rick Astley', uri: 'spotify:track:4PTG3Z6ehGkBFwjybzWkR8' },
  [GESTURES.POSE_BIEBER]: { name: 'Baby', artist: 'Justin Bieber', uri: 'spotify:track:6epn3r7S14KUqlReYr77hA' },
};

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
    this.lastMoonwalkTrackUri = null;
    this.isArtistPosePlaying = false;
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
   * Special handler for Artist Poses (MJ, Rick Astley, Justin Bieber).
   * Uses Queue-and-Skip Strategy (enqueueAndPlayTrack) to preserve user's active player context.
   * Concurrency guard (isArtistPosePlaying) with try-finally and isolated error handling.
   */
  async handleArtistPose(poseType, source = 'Gesture') {
    if (this.isArtistPosePlaying) {
      return;
    }

    this.isArtistPosePlaying = true;

    try {
      if (!this.api.isConnected()) {
        this.statusMessage = 'Connect Spotify to use music controls.';
        this.lastAction = { type: poseType, status: 'disconnected_notice', time: Date.now() };
        this.notifyListeners();
        return;
      }

      let chosenTrack = null;

      if (poseType === GESTURES.POSE_MJ || poseType === 'POSE_MJ') {
        let candidateTracks = MICHAEL_JACKSON_TRACKS;
        if (MICHAEL_JACKSON_TRACKS.length > 1 && this.lastMoonwalkTrackUri) {
          const filtered = MICHAEL_JACKSON_TRACKS.filter((t) => t.uri !== this.lastMoonwalkTrackUri);
          if (filtered.length > 0) {
            candidateTracks = filtered;
          }
        }
        chosenTrack = candidateTracks[Math.floor(Math.random() * candidateTracks.length)];
        this.lastMoonwalkTrackUri = chosenTrack.uri;
      } else if (SPECIAL_ARTIST_TRACKS[poseType]) {
        chosenTrack = SPECIAL_ARTIST_TRACKS[poseType];
      }

      if (!chosenTrack) {
        console.warn(`No track mapping found for pose ${poseType}`);
        return;
      }

      this.statusMessage = `🕺 Special Pose: ${chosenTrack.artist}! Queueing: ${chosenTrack.name}...`;
      this.notifyListeners();

      // Queue-and-Skip Strategy preserves user playback context for subsequent NEXT/PREVIOUS operations
      const playRes = await this.api.enqueueAndPlayTrack(chosenTrack.uri);

      if (playRes && playRes.success) {
        this.statusMessage = `🕺 Special Pose: ${chosenTrack.artist}! Playing: ${chosenTrack.name}`;
        this.lastAction = { type: poseType, status: 'success', source, time: Date.now() };
      } else {
        const errMsg = playRes?.message || `Failed to start ${chosenTrack.artist} playback.`;
        this.statusMessage = errMsg;
        this.lastAction = { type: poseType, status: 'error', message: errMsg, source, time: Date.now() };
      }

      this.notifyListeners();
    } catch (err) {
      console.error('Error executing Special Artist Pose playback:', err);
      this.statusMessage = 'Error starting artist track.';
      this.notifyListeners();
    } finally {
      this.isArtistPosePlaying = false;
    }
  }

  /**
   * Execute playback action manually or via gesture.
   */
  async executeCommand(actionType, source = 'Manual') {
    if (
      actionType === GESTURES.POSE_MJ || actionType === 'POSE_MJ' ||
      actionType === GESTURES.POSE_RICK || actionType === 'POSE_RICK' ||
      actionType === GESTURES.POSE_BIEBER || actionType === 'POSE_BIEBER'
    ) {
      return this.handleArtistPose(actionType, source);
    }

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
