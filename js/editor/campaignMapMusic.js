import {
  state
} from '../state.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  saveAssetFile
} from '../storage/assetStorage.js';

import {
  getStorageAdapter
} from '../storage/storageAdapter.js';

import {
  getMapPopup,
  showMapPopup
} from './campaignMapPopupController.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  CAMPAIGN_MAP_MUSIC_MODES,
  CAMPAIGN_MAP_MUSIC_ORDER,
  createTrackTitleFromPath,
  getCampaignMapPlaylist,
  normalizeCampaignMapMusic,
  normalizeMusicMode,
  normalizePlaylistOrder,
  updateCampaignMapPlaylist
} from './campaignMapMusicModel.js';


const audioByMap =
  new WeakMap();

const pendingUploadFilesByMap =
  new WeakMap();

const uploadStatusByMap =
  new WeakMap();

const playbackStatusByMap =
  new WeakMap();

let activePlaybackMap =
  null;

const MUSIC_UI_TEXT =
  Object.freeze({
    musicTitle:
      '\u041c\u0443\u0437\u044b\u043a\u0430 \u043a\u0430\u0440\u0442\u044b',
    normalMode:
      '\u041e\u0431\u044b\u0447\u043d\u0430\u044f',
    battleMode:
      '\u0411\u043e\u0439',
    nameLabel:
      '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435',
    shuffleTitle:
      '\u0421\u043b\u0443\u0447\u0430\u0439\u043d\u044b\u0439 \u043f\u043e\u0440\u044f\u0434\u043e\u043a',
    loopTitle:
      '\u0417\u0430\u0446\u0438\u043a\u043b\u0438\u0442\u044c \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442',
    previousTitle:
      '\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0430\u044f',
    playTitle:
      '\u0418\u0433\u0440\u0430\u0442\u044c',
    stopTitle:
      '\u0421\u0442\u043e\u043f',
    nextTitle:
      '\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0430\u044f',
    playlistLabel:
      '\u041f\u043b\u0435\u0439\u043b\u0438\u0441\u0442',
    emptyPlaylist:
      '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043f\u0435\u0441\u0435\u043d',
    addTracksLabel:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0435\u0441\u043d\u0438',
    chooseFiles:
      '\u0412\u044b\u0431\u043e\u0440 \u0444\u0430\u0439\u043b\u043e\u0432',
    adding:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u044e...',
    add:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c',
    copyPlaylistLabel:
      '\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442',
    choosePlaylist:
      '\u0412\u044b\u0431\u0435\u0440\u0438 \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442',
    copy:
      '\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c',
    removeTitle:
      '\u0423\u0431\u0440\u0430\u0442\u044c',
    addingTracks:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u044e \u043f\u0435\u0441\u043d\u0438...',
    tracksAdded:
      '\u041f\u0435\u0441\u0435\u043d \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e',
    stopped:
      '\u041e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e',
    nowPlaying:
      '\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u0435\u0442',
    ready:
      '\u0413\u043e\u0442\u043e\u0432\u043e \u043a \u0437\u0430\u043f\u0443\u0441\u043a\u0443',
    noTracks:
      '\u041d\u0435\u0442 \u0442\u0440\u0435\u043a\u043e\u0432',
    playlistEmpty:
      '\u041f\u043b\u0435\u0439\u043b\u0438\u0441\u0442 \u043f\u0443\u0441\u0442',
    selectedFiles:
      '\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0444\u0430\u0439\u043b\u043e\u0432',
    addFailed:
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0435\u0441\u043d\u0438',
    addFailedConsole:
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0435\u0441\u043d\u0438. \u041f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0441\u0442\u0438 \u0441\u043c\u043e\u0442\u0440\u0438 \u0432 \u043a\u043e\u043d\u0441\u043e\u043b\u0438.',
    playing:
      '\u0418\u0433\u0440\u0430\u0435\u0442',
    noActiveTracks:
      '\u0412 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u043c \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442\u0435 \u043d\u0435\u0442 \u043f\u0435\u0441\u0435\u043d',
    playbackFailed:
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u043c\u0443\u0437\u044b\u043a\u0443',
    playbackFailedAdvice:
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u043c\u0443\u0437\u044b\u043a\u0443. \u041f\u0440\u043e\u0432\u0435\u0440\u044c \u0444\u043e\u0440\u043c\u0430\u0442 \u0444\u0430\u0439\u043b\u0430 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f \u043a workspace.',
    blobUnavailable:
      'Audio Blob API is not available in this runtime.',
    objectUrlUnavailable:
      'Audio Object URL API is not available in this runtime.',
    mapFallback:
      '\u041a\u0430\u0440\u0442\u0430'
  });


function t(
  key
) {

  return MUSIC_UI_TEXT[key] || key;
}


export async function openCampaignMapMusicPopup(
  map,
  anchor,
  deps = {}
) {

  const popup =
    getMapPopup();

  const render =
    async () => {

      const store =
        getCampaignMapStore(
          map
        );

      const model =
        store?.getModel();

      const music =
        normalizeCampaignMapMusic(
          model?.music || {}
        );

      const mode =
        normalizeMusicMode(
          music.activeMode
        );

      const copyOptions =
        getCopyablePlaylists(
          map
        );

      const pendingUploadFiles =
        getPendingUploadFiles(
          map
        );

      const uploadStatus =
        uploadStatusByMap.get(
          map
        ) || {};

      const playbackStatus =
        playbackStatusByMap.get(
          map
        ) || {};

      popup.innerHTML =
        getCampaignMapMusicPopupHTML({
          music,
          mode,
          copyOptions,
          pendingUploadFiles,
          uploadStatus,
          playbackStatus
        });

      bindCampaignMapMusicPopup(
        popup,
        map,
        deps,
        render
      );
    };

  await render();

  showMapPopup(
    popup,
    anchor,
    'music'
  );
}


export function stopCampaignMapMusic(
  map
) {

  const audio =
    audioByMap.get(
      map
    );

  if (!audio) return;

  audio.pause();
  audio.currentTime =
    0;

  releaseAudioObjectURL(
    audio
  );
}


export async function playCampaignMapMusic(
  map,
  options = {}
) {

  const store =
    getCampaignMapStore(
      map
    );

  const music =
    normalizeCampaignMapMusic(
      store?.getModel()?.music || {}
    );

  const mode =
    normalizeMusicMode(
      options.mode ||
      music.activeMode
    );

  const playlist =
    getCampaignMapPlaylist(
      music,
      mode
    );

  if (playlist.tracks.length === 0) {

    stopCampaignMapMusic(
      map
    );

    return null;
  }

  const currentTrackId =
    getRuntimeTrackId(
      map
    );

  const track =
    options.track ||
    getNextTrackForPlayback(
      playlist,
      currentTrackId,
      options.direction || 'current'
    ) ||
    playlist.tracks[0];

  await playTrack(
    map,
    track,
    playlist
  );

  return track;
}


export async function playFirstCampaignMapMusicForMapSwitch(
  map
) {

  if (!map) return null;

  if (
    activePlaybackMap &&
    activePlaybackMap !== map
  ) {

    stopCampaignMapMusic(
      activePlaybackMap
    );
  }

  activePlaybackMap =
    map;

  try {

    return await playCampaignMapMusic(
      map,
      {
        direction:
          'first'
      }
    );

  } catch (error) {

    console.warn(
      'Failed to autoplay campaign map music.',
      error
    );

    return null;
  }
}


async function bindCampaignMapMusicPopup(
  popup,
  map,
  deps,
  render
) {

  popup
    .querySelectorAll('.campaign-music-mode-btn')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          await updateMusic(
            map,
            {
              activeMode:
                button.dataset.musicMode
            },
            deps
          );

          await playCampaignMapMusicAndReport(
            map,
            {
              mode:
                button.dataset.musicMode,
              direction:
                'first'
            },
            render
          );

        }
      );
    });

  popup
    .querySelector('.campaign-music-title-input')
    ?.addEventListener(
      'change',
      async event => {

        await patchActivePlaylist(
          map,
          {
            title:
              event.target.value
          },
          deps
        );

        await render();
      }
    );

  popup
    .querySelector('.campaign-music-upload-input')
    ?.addEventListener(
      'change',
      async event => {

        pendingUploadFilesByMap.set(
          map,
          Array.from(
          event.target.files || []
        )
        );

        uploadStatusByMap.delete(
          map
        );

        event.target.value =
          '';

        await render();
      }
    );

  popup
    .querySelector('.campaign-music-upload-add-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        const files =
          getPendingUploadFiles(
            map
          );

        if (files.length === 0) return;

        uploadStatusByMap.set(
          map,
          {
            state:
              'loading',
            message:
              t('addingTracks')
          }
        );

        await render();

        try {

          const tracks =
            await importAudioFilesToWorkspace(
              files
            );

          await addTracksToActivePlaylist(
            map,
            tracks,
            deps
          );

          pendingUploadFilesByMap.delete(
            map
          );

          uploadStatusByMap.set(
            map,
            {
              state:
                'success',
              message:
                `${t('tracksAdded')}: ${tracks.length}`
            }
          );

        } catch (error) {

          console.error(
            'Failed to add campaign map music.',
            error
          );

          uploadStatusByMap.set(
            map,
            {
              state:
                'error',
              message:
                getMusicUploadErrorMessage(
                  error
                )
            }
          );
        }

        await render();
      }
    );
  popup
    .querySelectorAll('.campaign-music-remove-track')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          await removeTrackFromActivePlaylist(
            map,
            button.dataset.trackId,
            deps
          );

          await render();
        }
      );
    });

  popup
    .querySelectorAll('.campaign-music-track-play')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          const playlist =
            getActivePlaylist(
              map
            );

          const track =
            playlist.tracks.find(item =>
              item.trackId === button.dataset.trackId
            );

          if (!track) return;

          await playCampaignMapMusicAndReport(
            map,
            {
              track
            },
            render
          );
        }
      );
    });

  popup
    .querySelector('.campaign-music-copy-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        const select =
          popup.querySelector('.campaign-music-copy-select');

        await copyPlaylistToActivePlaylist(
          map,
          select?.value || '',
          deps
        );

        await render();
      }
    );

  popup
    .querySelector('.campaign-music-order-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        const playlist =
          getActivePlaylist(
            map
          );

        await patchActivePlaylist(
          map,
          {
            order:
              playlist.order === CAMPAIGN_MAP_MUSIC_ORDER.shuffle
                ? CAMPAIGN_MAP_MUSIC_ORDER.list
                : CAMPAIGN_MAP_MUSIC_ORDER.shuffle
          },
          deps
        );

        await render();
      }
    );

  popup
    .querySelector('.campaign-music-loop-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        const playlist =
          getActivePlaylist(
            map
          );

        await patchActivePlaylist(
          map,
          {
            loop:
              !playlist.loop
          },
          deps
        );

        await render();
      }
    );

  popup
    .querySelector('.campaign-music-play-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        await playCampaignMapMusicAndReport(
          map,
          {
            direction:
              'current'
          },
          render
        );
      }
    );

  popup
    .querySelector('.campaign-music-stop-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        stopCampaignMapMusic(
          map
        );

        setPlaybackStatus(
          map,
          'info',
          t('stopped')
        );

        await render();
      }
    );
  popup
    .querySelector('.campaign-music-prev-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        await playCampaignMapMusicAndReport(
          map,
          {
            direction:
              'previous'
          },
          render
        );
      }
    );

  popup
    .querySelector('.campaign-music-next-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        await playCampaignMapMusicAndReport(
          map,
          {
            direction:
              'next'
          },
          render
        );
      }
    );
}


async function updateMusic(
  map,
  patch,
  deps = {}
) {

  const store =
    getCampaignMapStore(
      map
    );

  const music =
    normalizeCampaignMapMusic({
      ...store?.getModel()?.music,
      ...patch
    });

  store?.setMusic(
    music
  );

  await saveMapMusic(
    deps
  );

  return music;
}


async function patchActivePlaylist(
  map,
  patch,
  deps
) {

  const store =
    getCampaignMapStore(
      map
    );

  const music =
    normalizeCampaignMapMusic(
      store?.getModel()?.music || {}
    );

  const nextMusic =
    updateCampaignMapPlaylist(
      music,
      music.activeMode,
      patch
    );

  store?.setMusic(
    nextMusic
  );

  await saveMapMusic(
    deps
  );

  return nextMusic;
}


async function addTracksToActivePlaylist(
  map,
  tracks,
  deps
) {

  const playlist =
    getActivePlaylist(
      map
    );

  const knownPaths =
    new Set(
      playlist.tracks.map(item =>
        item.path
      )
    );

  const nextTracks =
    [
      ...playlist.tracks
    ];

  for (const track of tracks) {

    if (
      !track?.path ||
      knownPaths.has(
        track.path
      )
    ) {

      continue;
    }

    knownPaths.add(
      track.path
    );

    nextTracks.push({
      trackId:
        createTrackId(),
      title:
        track.title ||
        createTrackTitleFromPath(
          track.path
        ),
      path:
        track.path
    });
  }

  if (
    nextTracks.length === playlist.tracks.length
  ) return;

  await patchActivePlaylist(
    map,
    {
      tracks:
        nextTracks
    },
    deps
  );
}


async function removeTrackFromActivePlaylist(
  map,
  trackId,
  deps
) {

  const playlist =
    getActivePlaylist(
      map
    );

  await patchActivePlaylist(
    map,
    {
      tracks:
        playlist.tracks.filter(track =>
          track.trackId !== trackId
        )
    },
    deps
  );
}


async function copyPlaylistToActivePlaylist(
  map,
  value,
  deps
) {

  if (!value) return;

  const option =
    getCopyablePlaylists(
      map
    )
      .find(item =>
        item.id === value
      );

  if (!option) return;

  const playlist =
    option.playlist;

  await patchActivePlaylist(
    map,
    {
      title:
        playlist.title,
      order:
        playlist.order,
      loop:
        playlist.loop,
      tracks:
        playlist.tracks.map(track => ({
          ...track,
          trackId:
            createTrackId()
        }))
    },
    deps
  );
}


async function importAudioFilesToWorkspace(
  files
) {

  return Promise.all(
    files.map(async file => {

      const result =
        await saveAssetFile(
          file,
          {
            filename:
              `music/${createSafeAudioFilename(
                file.name
              )}`,
            resolveUrl:
              false
          }
        );

      return {
        path:
          normalizeImportedAudioPath(
            result.path
          ),
        title:
          createTrackTitleFromPath(
            result.path
          )
      };
    })
  );
}


function getActivePlaylist(
  map
) {

  const music =
    normalizeCampaignMapMusic(
      getCampaignMapStore(
        map
      )?.getModel()?.music || {}
    );

  return getCampaignMapPlaylist(
    music,
    music.activeMode
  );
}


async function playTrack(
  map,
  track,
  playlist
) {

  const audio =
    getAudioElement(
      map
    );

  audio.onended =
    async () => {

      if (
        playlist.loop ||
        playlist.order === CAMPAIGN_MAP_MUSIC_ORDER.shuffle
      ) {

        await playCampaignMapMusic(
          map,
          {
            direction:
              'next'
          }
        );
      }
    };

  releaseAudioObjectURL(
    audio
  );

  audio.src =
    await createAudioObjectURL(
      track.path
    );

  audio.dataset.objectUrl =
    audio.src;

  audio.dataset.trackId =
    track.trackId;

  audio.dataset.trackTitle =
    track.title;

  try {

    if (typeof audio.load === 'function') {

      audio.load();
    }

    await audio.play();

  } catch (error) {

    releaseAudioObjectURL(
      audio
    );

    audio.removeAttribute?.(
      'src'
    );

    audio.src =
      '';

    throw error;
  }
}


async function createAudioObjectURL(
  path
) {

  if (typeof Blob !== 'function') {

    throw new Error(
      t('blobUnavailable')
    );
  }

  if (
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {

    throw new Error(
      t('objectUrlUnavailable')
    );
  }

  const normalizedPath =
    normalizeAudioWorkspacePath(
      path
    );

  const buffer =
    await getStorageAdapter()
      .readBinary(
        normalizedPath
      );

  return URL.createObjectURL(
    new Blob(
      [buffer],
      {
        type:
          getAudioMimeType(
            normalizedPath
          )
      }
    )
  );
}

function normalizeAudioWorkspacePath(
  path
) {

  const normalized =
    String(path || '')
      .replaceAll('\\', '/')
      .replace(/^\/+/, '');

  return normalized.startsWith('assets/')
    ? normalized
    : `assets/${normalized}`;
}


function getAudioMimeType(
  path
) {

  const extension =
    String(path || '')
      .split('.')
      .pop()
      .toLowerCase();

  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'wav') return 'audio/wav';
  if (extension === 'ogg') return 'audio/ogg';
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'aac') return 'audio/aac';
  if (extension === 'flac') return 'audio/flac';
  if (extension === 'webm') return 'audio/webm';

  return 'audio/mpeg';
}


function releaseAudioObjectURL(
  audio
) {

  const objectUrl =
    audio?.dataset?.objectUrl || '';

  if (
    objectUrl &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {

    URL.revokeObjectURL(
      objectUrl
    );
  }

  if (audio?.dataset) {

    delete audio.dataset.objectUrl;
  }
}


function getAudioElement(
  map
) {

  const existing =
    audioByMap.get(
      map
    );

  if (existing) return existing;

  const audio =
    new Audio();

  audio.preload =
    'auto';

  if (
    typeof HTMLElement !== 'undefined' &&
    audio instanceof HTMLElement &&
    typeof document !== 'undefined' &&
    !audio.isConnected
  ) {

    audio.className =
      'campaign-map-music-audio';

    audio.style.display =
      'none';

    document.body.appendChild(
      audio
    );
  }

  audioByMap.set(
    map,
    audio
  );

  return audio;
}


function getRuntimeTrackId(
  map
) {

  return audioByMap.get(
    map
  )?.dataset?.trackId || '';
}


function getNextTrackForPlayback(
  playlist,
  currentTrackId,
  direction
) {

  if (
    direction === 'first' ||
    !currentTrackId
  ) {

    return playlist.tracks[0];
  }

  if (
    playlist.order === CAMPAIGN_MAP_MUSIC_ORDER.shuffle &&
    direction !== 'previous'
  ) {

    return getRandomTrack(
      playlist,
      currentTrackId
    );
  }

  const index =
    playlist.tracks.findIndex(track =>
      track.trackId === currentTrackId
    );

  if (index < 0) return playlist.tracks[0];

  const offset =
    direction === 'previous'
      ? -1
      : direction === 'next'
      ? 1
      : 0;

  const nextIndex =
    (index + offset + playlist.tracks.length) %
    playlist.tracks.length;

  return playlist.tracks[nextIndex];
}


function getRandomTrack(
  playlist,
  currentTrackId
) {

  const candidates =
    playlist.tracks.filter(track =>
      track.trackId !== currentTrackId
    );

  const list =
    candidates.length > 0
      ? candidates
      : playlist.tracks;

  return list[
    Math.floor(
      Math.random() * list.length
    )
  ];
}


function getCopyablePlaylists(
  currentMap
) {

  return (state.pages || [])
    .filter(page =>
      page?.type === 'campaignMap' ||
      page?.template === 'campaignMap'
    )
    .flatMap(page => {

      const music =
        readMusicFromPageContent(
          page.content || ''
        );

      const pageTitle =
        page.title || t('mapFallback');

      return [
        {
          id:
            `${page.id}:normal`,
          label:
            `${pageTitle} / ${music.normal.title}`,
          playlist:
            music.normal
        },
        {
          id:
            `${page.id}:battle`,
          label:
            `${pageTitle} / ${music.battle.title}`,
          playlist:
            music.battle
        }
      ];
    })
    .filter(option =>
      option.playlist.tracks.length > 0
    );
}

function readMusicFromPageContent(
  content
) {

  const match =
    String(content || '')
      .match(/data-map-music-state\s*=\s*["']([^"']+)["']/i);

  if (!match) {

    return normalizeCampaignMapMusic();
  }

  try {

    return normalizeCampaignMapMusic(
      JSON.parse(
        decodeURIComponent(
          decodeHTMLAttribute(
            match[1]
          )
        )
      )
    );

  } catch {

    return normalizeCampaignMapMusic();
  }
}


function getCampaignMapMusicPopupHTML({
  music,
  mode,
  copyOptions,
  pendingUploadFiles = [],
  uploadStatus = {},
  playbackStatus = {}
}) {

  const playlist =
    getCampaignMapPlaylist(
      music,
      mode
    );

  const playback =
    getPlaybackState(
      playlist,
      playbackStatus
    );

  return `
    <div class="campaign-music-player">
      <div class="campaign-music-now">
        <span class="campaign-music-now-kicker">${escapeHTML(playback.kicker)}</span>
        <strong>${escapeHTML(playback.title)}</strong>
      </div>
    </div>
    <div class="campaign-map-popup-title">${t('musicTitle')}</div>

    <div class="campaign-music-mode-row">
      ${getModeButton('normal', t('normalMode'), mode)}
      ${getModeButton('battle', t('battleMode'), mode)}
    </div>

    <label class="campaign-music-title-label">
      <span>${t('nameLabel')}</span>
      <input class="campaign-music-title-input" type="text" value="${escapeAttribute(playlist.title)}">
    </label>

    <div class="campaign-music-controls">
      <button class="campaign-music-order-btn ${playlist.order === CAMPAIGN_MAP_MUSIC_ORDER.shuffle ? 'is-active' : ''}" type="button" title="${t('shuffleTitle')}">${iconSvg('shuffle')}</button>
      <button class="campaign-music-loop-btn ${playlist.loop ? 'is-active' : ''}" type="button" title="${t('loopTitle')}">${iconSvg('repeat')}</button>
      <button class="campaign-music-prev-btn" type="button" title="${t('previousTitle')}">${iconSvg('skip-back')}</button>
      <button class="campaign-music-play-btn campaign-music-play-primary" type="button" title="${t('playTitle')}">${iconSvg('play')}</button>
      <button class="campaign-music-stop-btn" type="button" title="${t('stopTitle')}">${iconSvg('stop')}</button>
      <button class="campaign-music-next-btn" type="button" title="${t('nextTitle')}">${iconSvg('skip-forward')}</button>
    </div>

    ${getPlaybackStatusHTML(playbackStatus)}

    <div class="campaign-music-section">
      <strong>${t('playlistLabel')}</strong>
      <div class="campaign-music-track-list">
        ${playlist.tracks.length > 0
          ? playlist.tracks.map(track =>
            getPlaylistTrackHTML(
              track,
              playback.trackId
            )
          ).join('')
          : `<div class="campaign-music-empty">${t('emptyPlaylist')}</div>`}
      </div>
    </div>

    <div class="campaign-music-section">
      <strong>${t('addTracksLabel')}</strong>
      <div class="campaign-music-upload-row">
        <label class="campaign-music-upload">
          <input class="campaign-music-upload-input" type="file" accept="audio/*" multiple>
          <span>${t('chooseFiles')}</span>
        </label>
        <button class="campaign-music-upload-add-btn" type="button" ${pendingUploadFiles.length === 0 || uploadStatus.state === 'loading' ? 'disabled' : ''}>
          ${uploadStatus.state === 'loading' ? t('adding') : t('add')}
        </button>
      </div>
      ${getPendingUploadFilesHTML(pendingUploadFiles)}
      ${getUploadStatusHTML(uploadStatus)}
    </div>

    <div class="campaign-music-section">
      <strong>${t('copyPlaylistLabel')}</strong>
      <div class="campaign-music-copy-row">
        <select class="campaign-music-copy-select">
          <option value="">${t('choosePlaylist')}</option>
          ${copyOptions.map(option => `
            <option value="${escapeAttribute(option.id)}">${escapeHTML(option.label)}</option>
          `).join('')}
        </select>
        <button class="campaign-music-copy-btn" type="button" ${copyOptions.length === 0 ? 'disabled' : ''}>${t('copy')}</button>
      </div>
    </div>
  `;
}

function getPlaybackState(
  playlist,
  playbackStatus = {}
) {

  const currentTrackId =
    String(playbackStatus.trackId || '');

  const statusMessage =
    String(playbackStatus.message || '');

  const currentTrack =
    playlist.tracks.find(track =>
      track.trackId === currentTrackId
    ) ||
    playlist.tracks.find(track =>
      statusMessage.includes(
        track.title
      )
    ) || null;

  return {
    trackId:
      currentTrack?.trackId || '',
    title:
      currentTrack?.title ||
      playlist.tracks[0]?.title ||
      t('playlistEmpty'),
    kicker:
      currentTrack
        ? t('nowPlaying')
        : playlist.tracks.length > 0
        ? t('ready')
        : t('noTracks')
  };
}


function getPendingUploadFilesHTML(
  files
) {

  if (files.length === 0) return '';

  return `
    <div class="campaign-music-upload-pending">
      ${t('selectedFiles')}: ${files.length}
    </div>
  `;
}


function getUploadStatusHTML(
  uploadStatus
) {

  if (!uploadStatus?.message) return '';

  return `
    <div class="campaign-music-upload-status is-${escapeAttribute(uploadStatus.state || 'info')}">
      ${escapeHTML(uploadStatus.message)}
    </div>
  `;
}


function getPlaybackStatusHTML(
  playbackStatus
) {

  if (!playbackStatus?.message) return '';

  return `
    <div class="campaign-music-playback-status is-${escapeAttribute(playbackStatus.state || 'info')}">
      ${escapeHTML(playbackStatus.message)}
    </div>
  `;
}


function getPendingUploadFiles(
  map
) {

  return pendingUploadFilesByMap.get(
    map
  ) || [];
}


function getMusicUploadErrorMessage(
  error
) {

  const message =
    error?.message ||
    error?.toString?.() ||
    '';

  return message
    ? `${t('addFailed')}: ${message}`
    : t('addFailedConsole');
}


function getModeButton(
  mode,
  label,
  activeMode
) {

  return `
    <button
      class="campaign-music-mode-btn ${activeMode === mode ? 'is-active' : ''}"
      type="button"
      data-music-mode="${escapeAttribute(mode)}"
    >
      ${escapeHTML(label)}
    </button>
  `;
}


function getPlaylistTrackHTML(
  track,
  currentTrackId = ''
) {

  const isCurrent =
    track.trackId === currentTrackId;

  return `
    <div class="campaign-music-track-row ${isCurrent ? 'is-playing' : ''}" data-track-id="${escapeAttribute(track.trackId)}">
      <button class="campaign-music-track-play" type="button" data-track-id="${escapeAttribute(track.trackId)}" title="${t('playTitle')}">
        <span class="campaign-music-track-index">${isCurrent ? '&blacktriangleright;' : '&#9834;'}</span>
        <span class="campaign-music-track-title">${escapeHTML(track.title)}</span>
      </button>
      <button class="campaign-music-remove-track" type="button" data-track-id="${escapeAttribute(track.trackId)}" title="${t('removeTitle')}">&times;</button>
    </div>
  `;
}

function createSafeAudioFilename(
  name
) {

  const fallback =
    `track-${Date.now()}.mp3`;

  const rawName =
    String(name || fallback)
      .replaceAll('\\', '/')
      .split('/')
      .pop()
      .trim();

  const extension =
    rawName.includes('.')
      ? `.${rawName.split('.').pop()}`
      : '.mp3';

  const baseName =
    rawName
      .replace(/\.[^.]+$/, '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_ .-]+|[_ .-]+$/g, '') ||
    `track-${Date.now()}`;

  return `${baseName}${extension}`;
}

function normalizeImportedAudioPath(
  path
) {

  const normalized =
    String(path || '')
      .replaceAll('\\', '/')
      .replace(/^\/+/, '');

  return normalized.startsWith('assets/')
    ? normalized
    : `assets/${normalized}`;
}


function createTrackId() {

  if (globalThis.crypto?.randomUUID) {

    return `track-${globalThis.crypto.randomUUID()}`;
  }

  return `track-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}


async function playCampaignMapMusicAndReport(
  map,
  options,
  render
) {

  try {

    const track =
      await playCampaignMapMusic(
        map,
        options
      );

    setPlaybackStatus(
      map,
      track
        ? 'success'
        : 'info',
      track
        ? `${t('playing')}: ${track.title}`
        : t('noActiveTracks'),
      track?.trackId || ''
    );

  } catch (error) {

    console.error(
      'Failed to start campaign map music.',
      error
    );

    setPlaybackStatus(
      map,
      'error',
      getMusicPlaybackErrorMessage(
        error
      )
    );
  }

  if (typeof render === 'function') {

    await render();
  }
}

function setPlaybackStatus(
  map,
  state,
  message,
  trackId = ''
) {

  playbackStatusByMap.set(
    map,
    {
      state,
      message,
      trackId
    }
  );
}


function getMusicPlaybackErrorMessage(
  error
) {

  const message =
    error?.message ||
    error?.toString?.() ||
    '';

  return message
    ? `${t('playbackFailed')}: ${message}`
    : t('playbackFailedAdvice');
}

async function saveMapMusic(
  deps
) {

  if (typeof deps.saveAndSync === 'function') {

    await deps.saveAndSync();
  }
}


function decodeHTMLAttribute(
  value
) {

  return String(value)
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}


function escapeHTML(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  )
    .replaceAll('"', '&quot;');
}
