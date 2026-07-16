import {
  ASSET_TYPES,
  createAssetReference,
  normalizeAssetPath
} from '../storage/assetReference.js';


export const CAMPAIGN_MAP_MUSIC_MODES =
  Object.freeze({
    normal: 'normal',
    battle: 'battle'
  });


export const CAMPAIGN_MAP_MUSIC_ORDER =
  Object.freeze({
    list: 'list',
    shuffle: 'shuffle'
  });


const DEFAULT_NORMAL_PLAYLIST_TITLE =
  'Обычная музыка';

const DEFAULT_BATTLE_PLAYLIST_TITLE =
  'Боевая музыка';

const DEFAULT_PLAYLIST_TITLE =
  'Плейлист';

const DEFAULT_TRACK_TITLE =
  'Трек';


export function normalizeCampaignMapMusic(
  input = {}
) {

  const activeMode =
    normalizeMusicMode(
      input.activeMode
    );

  const normal =
    normalizeCampaignMapPlaylist(
      input.normal,
      {
        fallbackTitle:
          DEFAULT_NORMAL_PLAYLIST_TITLE
      }
    );

  const battle =
    normalizeCampaignMapPlaylist(
      input.battle,
      {
        fallbackTitle:
          DEFAULT_BATTLE_PLAYLIST_TITLE
      }
    );

  return {
    version:
      1,
    activeMode,
    normal,
    battle
  };
}


export function normalizeCampaignMapPlaylist(
  input = {},
  options = {}
) {

  const title =
    normalizeText(
      input.title
    ) ||
    options.fallbackTitle ||
    DEFAULT_PLAYLIST_TITLE;

  return {
    playlistId:
      normalizeText(
        input.playlistId
      ) ||
      createMusicId(
        'playlist'
      ),
    title,
    order:
      normalizePlaylistOrder(
        input.order
      ),
    loop:
      Boolean(
        input.loop
      ),
    tracks:
      normalizePlaylistTracks(
        input.tracks
      )
  };
}


export function normalizePlaylistTracks(
  tracks = []
) {

  if (!Array.isArray(tracks)) return [];

  const seen =
    new Set();

  return tracks
    .map(track =>
      normalizePlaylistTrack(
        track
      )
    )
    .filter(track =>
      track.path
    )
    .filter(track => {

      const key =
        track.trackId || track.path;

      if (
        seen.has(
          key
        )
      ) {

        return false;
      }

      seen.add(
        key
      );

      return true;
    });
}


export function normalizePlaylistTrack(
  input = {}
) {

  const path =
    normalizeAssetPath(
      input.path ||
      input.audioAsset ||
      ''
    );

  const title =
    normalizeText(
      input.title
    ) ||
    createTrackTitleFromPath(
      path
    );

  return {
    trackId:
      normalizeText(
        input.trackId
      ) ||
      createMusicId(
        'track'
      ),
    title,
    path
  };
}


export function getCampaignMapPlaylist(
  music,
  mode
) {

  const normalized =
    normalizeCampaignMapMusic(
      music
    );

  return normalized[
    normalizeMusicMode(
      mode
    )
  ];
}


export function updateCampaignMapPlaylist(
  music,
  mode,
  patch = {}
) {

  const normalized =
    normalizeCampaignMapMusic(
      music
    );

  const key =
    normalizeMusicMode(
      mode
    );

  return normalizeCampaignMapMusic({
    ...normalized,
    [key]:
      normalizeCampaignMapPlaylist(
        {
          ...normalized[key],
          ...patch
        },
        {
          fallbackTitle:
            key === CAMPAIGN_MAP_MUSIC_MODES.battle
              ? DEFAULT_BATTLE_PLAYLIST_TITLE
              : DEFAULT_NORMAL_PLAYLIST_TITLE
        }
      )
  });
}


export function createCampaignMapMusicReferences(
  music = {},
  owner = {}
) {

  const normalized =
    normalizeCampaignMapMusic(
      music
    );

  return [
    ...createPlaylistReferences(
      normalized.normal,
      {
        ...owner,
        mode:
          CAMPAIGN_MAP_MUSIC_MODES.normal
      }
    ),
    ...createPlaylistReferences(
      normalized.battle,
      {
        ...owner,
        mode:
          CAMPAIGN_MAP_MUSIC_MODES.battle
      }
    )
  ];
}


export function createTrackTitleFromPath(
  path
) {

  const name =
    String(path || '')
      .split('/')
      .pop() ||
    '';

  return name
    .replace(/\.[^.]+$/, '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .trim() ||
    DEFAULT_TRACK_TITLE;
}


export function normalizeMusicMode(
  value
) {

  return value === CAMPAIGN_MAP_MUSIC_MODES.battle
    ? CAMPAIGN_MAP_MUSIC_MODES.battle
    : CAMPAIGN_MAP_MUSIC_MODES.normal;
}


export function normalizePlaylistOrder(
  value
) {

  return value === CAMPAIGN_MAP_MUSIC_ORDER.shuffle
    ? CAMPAIGN_MAP_MUSIC_ORDER.shuffle
    : CAMPAIGN_MAP_MUSIC_ORDER.list;
}


function createPlaylistReferences(
  playlist,
  owner
) {

  return playlist.tracks.map((track, index) =>
    createAssetReference({
      id:
        `${owner.pageId || 'map'}:music:${owner.mode}:${index}`,
      path:
        track.path,
      type:
        ASSET_TYPES.audio,
      owner: {
        pageId:
          owner.pageId || '',
        entityId:
          playlist.playlistId,
        scope:
          `campaignMapMusic:${owner.mode}`
      }
    })
  );
}


function createMusicId(
  prefix
) {

  if (globalThis.crypto?.randomUUID) {

    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
}
