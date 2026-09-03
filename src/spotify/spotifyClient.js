import { spotifyApi } from './spotifyApi';
import { spotifyController } from './spotifyController';

export { spotifyApi, spotifyController };

export async function initSpotifyAuth() {
  return spotifyApi.handleAuthCallback();
}
