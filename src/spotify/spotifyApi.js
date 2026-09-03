/**
 * Spotify Web API Client with PKCE Authorization Code Flow
 */

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_BASE_API_URL = 'https://api.spotify.com/v1';

// Spotify OAuth Loopback Redirect URI loaded from environment
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5173/callback';

const SCOPES = [
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
].join(' ');

// PKCE Helpers
function generateRandomString(length = 64) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class SpotifyApi {
  constructor() {
    this.clientId = localStorage.getItem('soleswitch_spotify_client_id') || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
  }

  setClientId(clientId) {
    this.clientId = clientId.trim();
    localStorage.setItem('soleswitch_spotify_client_id', this.clientId);
  }

  getClientId() {
    return this.clientId;
  }

  getAccessToken() {
    return sessionStorage.getItem('spotify_access_token');
  }

  isConnected() {
    return !!this.getAccessToken();
  }

  /**
   * Initiate PKCE Authorization Code login flow
   */
  async login(clientId = this.clientId) {
    if (clientId) {
      this.setClientId(clientId);
    }

    if (!this.clientId) {
      throw new Error('Please enter a valid Spotify Client ID.');
    }

    const codeVerifier = generateRandomString(64);
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64urlencode(hashed);

    const redirectUri = SPOTIFY_REDIRECT_URI;

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Handle OAuth redirect code exchange
   */
  async handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('Spotify Authorization error:', error);
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    }

    if (code) {
      const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
      const redirectUri = SPOTIFY_REDIRECT_URI;

      if (!codeVerifier) {
        console.error('Missing PKCE code verifier in session storage.');
        return false;
      }

      try {
        const response = await fetch(SPOTIFY_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          }),
        });

        const data = await response.json();

        if (data.access_token) {
          sessionStorage.setItem('spotify_access_token', data.access_token);
          if (data.refresh_token) {
            sessionStorage.setItem('spotify_refresh_token', data.refresh_token);
          }
          // Clean query params from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        } else {
          console.error('Token exchange failed:', data);
        }
      } catch (err) {
        console.error('Error during token exchange:', err);
      }
    }

    return false;
  }

  logout() {
    sessionStorage.removeItem('spotify_access_token');
    sessionStorage.removeItem('spotify_refresh_token');
    sessionStorage.removeItem('spotify_code_verifier');
  }

  /**
   * Execute fetch request to Spotify REST API
   */
  async request(endpoint, method = 'GET', body = null) {
    const token = this.getAccessToken();

    if (!token) {
      return { success: false, status: 401, message: 'Not connected to Spotify.' };
    }

    const options = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${SPOTIFY_BASE_API_URL}${endpoint}`, options);

      // 204 No Content is success for Spotify playback controls
      if (response.status === 204) {
        return { success: true, status: 204 };
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          message: data?.error?.message || `Spotify API Error (${response.status})`,
        };
      }

      return { success: true, status: response.status, data };
    } catch (err) {
      console.error(`Spotify API call failed [${method} ${endpoint}]:`, err);
      return { success: false, status: 500, message: err.message };
    }
  }

  /**
   * Get available Spotify playback devices
   */
  async getDevices() {
    const res = await this.request('/me/player/devices', 'GET');
    return {
      success: res.success,
      status: res.status,
      devices: res.data?.devices || [],
    };
  }

  /**
   * Transfer playback to target device ID
   */
  async transferPlayback(deviceId) {
    return this.request('/me/player', 'PUT', {
      device_ids: [deviceId],
      play: true,
    });
  }

  /**
   * Helper wrapper for playback commands:
   * Handles 404 NO_ACTIVE_DEVICE by discovering available devices and retrying once.
   */
  async executeWithDeviceRecovery(commandFn) {
    const res = await commandFn();

    // Check if error is NO_ACTIVE_DEVICE (404)
    const isNoDeviceError =
      res &&
      !res.success &&
      (res.status === 404 || (res.message && res.message.toLowerCase().includes('device')));

    if (isNoDeviceError) {
      const devicesRes = await this.getDevices();
      const devices = devicesRes.devices || [];

      if (devices.length === 0) {
        return {
          success: false,
          status: 404,
          message: 'Open Spotify on your phone or desktop to activate controls.',
        };
      }

      // Preference order:
      // 1. is_active === true
      // 2. type === 'Computer'
      // 3. First available device
      const bestDevice =
        devices.find((d) => d.is_active) ||
        devices.find((d) => d.type === 'Computer') ||
        devices[0];

      if (bestDevice && bestDevice.id) {
        const transferRes = await this.transferPlayback(bestDevice.id);
        if (transferRes.success) {
          // Wait brief delay for player state activation
          await new Promise((resolve) => setTimeout(resolve, 300));
          // Retry original command once
          return commandFn();
        }
      }

      return {
        success: false,
        status: 404,
        message: 'Open Spotify on your phone or desktop to activate controls.',
      };
    }

    return res;
  }

  // Playback Operations (Wrapped with automatic device recovery)
  async play() {
    return this.executeWithDeviceRecovery(() => this.request('/me/player/play', 'PUT'));
  }

  async pause() {
    return this.executeWithDeviceRecovery(() => this.request('/me/player/pause', 'PUT'));
  }

  async next() {
    return this.executeWithDeviceRecovery(() => this.request('/me/player/next', 'POST'));
  }

  async previous() {
    return this.executeWithDeviceRecovery(() => this.request('/me/player/previous', 'POST'));
  }

  async getCurrentPlayback() {
    return this.request('/me/player', 'GET');
  }
}

export const spotifyApi = new SpotifyApi();
