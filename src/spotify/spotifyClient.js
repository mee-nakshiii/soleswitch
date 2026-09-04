/**
 * Spotify Integration Module Entry Point
 */

export * as auth from './spotifyAuth.js';
export * as api from './spotifyApi.js';
export * as controller from './spotifyController.js';

export { loginWithSpotify, handleAuthCallback, getAccessToken, logout, isAuthenticated } from './spotifyAuth.js';
export { getCurrentPlaybackState, play, pause, next, previous, setVolume, playTrack } from './spotifyApi.js';
export { handleSemanticEvent, dispatchSemanticEvent } from './spotifyController.js';
