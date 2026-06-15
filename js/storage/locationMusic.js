import {
  ASSET_TYPES,
  createAssetReference,
  normalizeAssetPath
} from './assetReference.js';


export function normalizeLocationMusic(
  input = {}
) {

  const audioPath =
    normalizeAssetPath(
      input.audioAsset ||
      input.audioPath ||
      ''
    );

  const playlistPath =
    normalizeAssetPath(
      input.playlistAsset ||
      input.playlistPath ||
      ''
    );

  return {
    version:
      1,
    enabled:
      input.enabled !== false,
    title:
      normalizeText(
        input.title
      ),
    volume:
      normalizeVolume(
        input.volume
      ),
    loop:
      Boolean(
        input.loop
      ),
    autoplay:
      Boolean(
        input.autoplay
      ),
    audioAsset:
      audioPath,
    playlistAsset:
      playlistPath,
    references:
      createLocationMusicReferences({
        pageId:
          input.pageId,
        audioAsset:
          audioPath,
        playlistAsset:
          playlistPath
      })
  };
}


export function createLocationMusicHTML(
  input = {}
) {

  const music =
    normalizeLocationMusic(
      input
    );

  const attributes =
    [
      music.audioAsset
        ? `data-audio-asset="${escapeHTMLAttribute(music.audioAsset)}"`
        : '',
      music.playlistAsset
        ? `data-playlist-asset="${escapeHTMLAttribute(music.playlistAsset)}"`
        : ''
    ]
      .filter(Boolean)
      .join(' ');

  return `<script type="application/json" class="location-music-data" data-location-music ${attributes}>${escapeScriptJSON(JSON.stringify(music))}</script>`;
}


export function readLocationMusicFromHTML(
  html = ''
) {

  const match =
    String(html)
      .match(
        /<script[^>]*data-location-music[^>]*>([\s\S]*?)<\/script>/i
      );

  if (!match) {

    return normalizeLocationMusic();
  }

  try {

    return normalizeLocationMusic(
      JSON.parse(
        match[1]
      )
    );

  } catch (error) {

    return normalizeLocationMusic();
  }
}


export function createLocationMusicReferences({
  pageId = '',
  audioAsset = '',
  playlistAsset = ''
} = {}) {

  const references =
    [];

  if (audioAsset) {

    references.push(
      createAssetReference({
        id:
          `${pageId || 'location'}:music:audio`,
        path:
          audioAsset,
        type:
          ASSET_TYPES.audio,
        owner: {
          pageId,
          scope:
            'locationMusic'
        }
      })
    );
  }

  if (playlistAsset) {

    references.push(
      createAssetReference({
        id:
          `${pageId || 'location'}:music:playlist`,
        path:
          playlistAsset,
        type:
          ASSET_TYPES.playlist,
        owner: {
          pageId,
          scope:
            'locationMusic'
        }
      })
    );
  }

  return references;
}


function normalizeVolume(
  value
) {

  const number =
    Number(
      value
    );

  if (!Number.isFinite(number)) {

    return 0.7;
  }

  return Math.min(
    1,
    Math.max(
      0,
      number
    )
  );
}


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
}


function escapeHTMLAttribute(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function escapeScriptJSON(
  value
) {

  return String(value)
    .replaceAll('</script', '<\\/script');
}
