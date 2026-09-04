/**
 * Spotify PKCE Authentication Module
 * Implements Spotify Authorization Code Flow with Proof Key for Code Exchange (PKCE).
 * No backend or client secret required.
 */

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'soleswitch_spotify_access_token',
  REFRESH_TOKEN: 'soleswitch_spotify_refresh_token',
  EXPIRES_AT: 'soleswitch_spotify_expires_at',
  CODE_VERIFIER: 'soleswitch_spotify_code_verifier',
  CLIENT_ID: 'soleswitch_spotify_client_id',
};

const DEFAULT_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
];

/**
 * Gets the current configured Spotify Client ID.
 * Checks environment variable first, then localStorage.
 */
export function getClientId() {
  const envId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  if (envId && envId !== 'your_spotify_client_id_here') {
    return envId.trim();
  }
  return (localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || '').trim();
}

/**
 * Saves a user-provided Client ID to localStorage.
 */
export function setClientId(clientId) {
  if (clientId) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
  }
}

/**
 * Gets the redirect URI for Spotify OAuth.
 */
export function getRedirectUri() {
  const envUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  if (envUri && envUri !== 'http://localhost:5173') {
    return envUri.trim();
  }
  // Fall back to the current browser origin + pathname (without search queries or hash)
  return window.location.origin + window.location.pathname;
}

/**
 * Generates a random cryptographic string for PKCE code_verifier.
 */
export function generateCodeVerifier(length = 64) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('');
}

/**
 * Generates the SHA-256 base64url-encoded code_challenge from code_verifier.
 */
export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Initiates the Spotify PKCE login redirect.
 */
export async function loginWithSpotify(overrideClientId = null) {
  if (overrideClientId) {
    setClientId(overrideClientId);
  }

  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Spotify Client ID is required. Please set VITE_SPOTIFY_CLIENT_ID or provide one in settings.');
  }

  const redirectUri = getRedirectUri();
  const verifier = generateCodeVerifier(64);
  const challenge = await generateCodeChallenge(verifier);

  // Store code_verifier for exchange after redirect
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: DEFAULT_SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Checks for and handles the OAuth callback URL containing ?code=...
 * Should be called on application initialization.
 */
export async function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    // Clear URL query params
    window.history.replaceState({}, document.title, window.location.pathname);
    return { success: false, error: `Spotify Auth Error: ${error}` };
  }

  if (!code) {
    return { success: false, reason: 'no_code' };
  }

  const codeVerifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  const clientId = getClientId();
  const redirectUri = getRedirectUri();

  if (!codeVerifier) {
    window.history.replaceState({}, document.title, window.location.pathname);
    return { success: false, error: 'PKCE Code Verifier not found in storage. Please try logging in again.' };
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const msg = data.error_description || data.error || 'Failed to exchange authorization code';
      return { success: false, error: msg };
    }

    // Save tokens and expiry
    saveTokens(data);

    // Clean up code verifier from storage
    localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);

    // Clean up URL search parameters cleanly
    window.history.replaceState({}, document.title, window.location.pathname);

    return { success: true, accessToken: data.access_token };
  } catch (err) {
    return { success: false, error: err.message || 'Network error during token exchange' };
  }
}

/**
 * Saves access token, refresh token, and expiration timestamp.
 */
function saveTokens(tokenData) {
  if (tokenData.access_token) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
  }
  if (tokenData.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
  }
  if (tokenData.expires_in) {
    const expiresAt = Date.now() + tokenData.expires_in * 1000;
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  }
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const clientId = getClientId();

  if (!refreshToken || !clientId) {
    logout();
    return null;
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      logout();
      return null;
    }

    saveTokens(data);
    return data.access_token;
  } catch (err) {
    console.error('Failed to refresh Spotify access token:', err);
    return null;
  }
}

/**
 * Retrieves a valid access token. Automatically refreshes if close to expiring.
 * Returns null if not authenticated.
 */
export async function getAccessToken() {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.EXPIRES_AT) || '0', 10);

  if (!token) {
    return null;
  }

  // If token expires in less than 60 seconds, refresh it
  if (Date.now() >= expiresAt - 60000) {
    return await refreshAccessToken();
  }

  return token;
}

/**
 * Returns true if the user has an active token or can refresh it.
 */
export function isAuthenticated() {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  return Boolean(token || refreshToken);
}

/**
 * Logs the user out by clearing all Spotify auth tokens from storage.
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
}
