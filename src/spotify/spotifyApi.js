/**
 * Spotify Web API Client Module
 * Provides simple functions for controlling playback and querying state.
 * Uses access token obtained from spotifyAuth.js.
 */

import { getAccessToken, logout } from './spotifyAuth.js';

const BASE_URL = 'https://api.spotify.com/v1/me/player';

/**
 * Base fetch wrapper for Spotify Web API endpoints.
 */
async function spotifyFetch(endpoint, options = {}) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not connected to Spotify. Please connect your Spotify account first.');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content (common for playback controls and inactive player)
  if (response.status === 204) {
    return null;
  }

  // Handle errors
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText } };
    }

    const status = response.status;
    const message = errorData?.error?.message || response.statusText;
    const reason = errorData?.error?.reason;

    if (status === 401) {
      logout();
      throw new Error('Spotify session expired. Please reconnect your account.');
    }

    if (status === 403) {
      if (reason === 'PREMIUM_REQUIRED') {
        throw new Error('Spotify Premium is required for remote playback control.');
      }
      if (reason === 'VOLUME_CONTROL_DISALLOWED') {
        throw new Error('Volume control is not supported on this active Spotify device.');
      }
      throw new Error(`Spotify action forbidden: ${message}`);
    }

    if (status === 404) {
      throw new Error('No active Spotify device found. Please open Spotify on your computer or phone and start playing.');
    }

    throw new Error(message || `Spotify API error (${status})`);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Gets the current playback state (active track, progress, volume, is_playing, device).
 * Returns null if no active player session exists.
 */
export async function getCurrentPlaybackState() {
  try {
    const data = await spotifyFetch('');
    if (!data) return null;

    return {
      isPlaying: data.is_playing || false,
      progressMs: data.progress_ms || 0,
      durationMs: data.item?.duration_ms || 0,
      volumePercent: data.device?.volume_percent ?? 50,
      device: data.device
        ? {
            id: data.device.id,
            name: data.device.name,
            type: data.device.type,
            volumePercent: data.device.volume_percent,
            isActive: data.device.is_active,
          }
        : null,
      track: data.item
        ? {
            id: data.item.id,
            name: data.item.name,
            uri: data.item.uri,
            artists: data.item.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
            album: data.item.album?.name || '',
            albumArt: data.item.album?.images?.[0]?.url || null,
          }
        : null,
    };
  } catch (err) {
    if (err.message.includes('No active Spotify device')) {
      return null;
    }
    throw err;
  }
}

/**
 * Gets the list of available Spotify devices.
 */
export async function getAvailableDevices() {
  const data = await spotifyFetch('/devices');
  return data?.devices || [];
}

/**
 * Resumes or starts playback.
 */
export async function play(deviceId = null) {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  return await spotifyFetch(`/play${query}`, {
    method: 'PUT',
  });
}

/**
 * Pauses playback.
 */
export async function pause(deviceId = null) {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  return await spotifyFetch(`/pause${query}`, {
    method: 'PUT',
  });
}

/**
 * Skips to next track.
 */
export async function next(deviceId = null) {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  return await spotifyFetch(`/next${query}`, {
    method: 'POST',
  });
}

/**
 * Skips to previous track.
 */
export async function previous(deviceId = null) {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  return await spotifyFetch(`/previous${query}`, {
    method: 'POST',
  });
}

/**
 * Sets playback volume (0 to 100).
 */
export async function setVolume(volumePercent, deviceId = null) {
  const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';
  return await spotifyFetch(`/volume?volume_percent=${clamped}${deviceParam}`, {
    method: 'PUT',
  });
}

/**
 * Plays a specific track URI (or resumes if none specified).
 */
export async function playTrack(trackUri, deviceId = null) {
  const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
  return await spotifyFetch(`/play${query}`, {
    method: 'PUT',
    body: {
      uris: [trackUri],
    },
  });
}

/**
 * Seeks to a specific position in the currently playing track (in ms).
 */
export async function seek(positionMs, deviceId = null) {
  const deviceParam = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';
  return await spotifyFetch(`/seek?position_ms=${Math.max(0, Math.round(positionMs))}${deviceParam}`, {
    method: 'PUT',
  });
}
