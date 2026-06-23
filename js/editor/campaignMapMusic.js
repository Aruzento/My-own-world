import {
  state
} from '../state.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  getImageURL,
  saveAssetFile
} from '../storage/assetStorage.js';

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

  if (playlist.tracks.length === 0) return null;

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
              'Добавляю песни...'
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
                `Песен добавлено: ${tracks.length}`
            }
          );

        } catch (error) {

          console.error(
            'Не удалось добавить музыку в плейлист.',
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
          'Остановлено'
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

  const tracks =
    [];

  for (const file of files) {

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

    tracks.push({
      path:
        normalizeImportedAudioPath(
          result.path
        ),
      title:
        createTrackTitleFromPath(
          result.path
        )
    });
  }

  return tracks;
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

  audio.src =
    await getImageURL(
      track.path
    );

  audio.dataset.trackId =
    track.trackId;

  audio.dataset.trackTitle =
    track.title;

  await audio.play();
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

      return [
        {
          id:
            `${page.id}:normal`,
          label:
            `${page.title || 'Карта'} / ${music.normal.title}`,
          playlist:
            music.normal
        },
        {
          id:
            `${page.id}:battle`,
          label:
            `${page.title || 'Карта'} / ${music.battle.title}`,
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

  return `
    <div class="campaign-map-popup-title">Музыка карты</div>

    <div class="campaign-music-mode-row">
      ${getModeButton('normal', 'Обычная', mode)}
      ${getModeButton('battle', 'Бой', mode)}
    </div>

    <label class="campaign-music-title-label">
      <span>Название плейлиста</span>
      <input class="campaign-music-title-input" type="text" value="${escapeAttribute(playlist.title)}">
    </label>

    <div class="campaign-music-controls">
      <button class="campaign-music-order-btn ${playlist.order === CAMPAIGN_MAP_MUSIC_ORDER.shuffle ? 'is-active' : ''}" type="button" title="Случайный порядок">${iconSvg('shuffle')}</button>
      <button class="campaign-music-loop-btn ${playlist.loop ? 'is-active' : ''}" type="button" title="Зациклить плейлист">${iconSvg('repeat')}</button>
      <button class="campaign-music-prev-btn" type="button" title="Предыдущая">${iconSvg('skip-back')}</button>
      <button class="campaign-music-play-btn" type="button" title="Играть">${iconSvg('play')}</button>
      <button class="campaign-music-stop-btn" type="button" title="Стоп">${iconSvg('stop')}</button>
      <button class="campaign-music-next-btn" type="button" title="Следующая">${iconSvg('skip-forward')}</button>
    </div>

    ${getPlaybackStatusHTML(playbackStatus)}

    <div class="campaign-music-section">
      <strong>Плейлист</strong>
      <div class="campaign-music-track-list">
        ${playlist.tracks.length > 0
          ? playlist.tracks.map(getPlaylistTrackHTML).join('')
          : '<div class="campaign-music-empty">Пока нет песен</div>'}
      </div>
    </div>

    <div class="campaign-music-section">
      <strong>Добавить песню</strong>
      <div class="campaign-music-upload-row">
        <label class="campaign-music-upload">
          <input class="campaign-music-upload-input" type="file" accept="audio/*" multiple>
          <span>Выбор файлов</span>
        </label>
        <button class="campaign-music-upload-add-btn" type="button" ${pendingUploadFiles.length === 0 || uploadStatus.state === 'loading' ? 'disabled' : ''}>
          ${uploadStatus.state === 'loading' ? 'Добавляю...' : 'Добавить'}
        </button>
      </div>
      ${getPendingUploadFilesHTML(pendingUploadFiles)}
      ${getUploadStatusHTML(uploadStatus)}
    </div>

    <div class="campaign-music-section">
      <strong>Скопировать плейлист</strong>
      <div class="campaign-music-copy-row">
        <select class="campaign-music-copy-select">
          <option value="">Выбери плейлист</option>
          ${copyOptions.map(option => `
            <option value="${escapeAttribute(option.id)}">${escapeHTML(option.label)}</option>
          `).join('')}
        </select>
        <button class="campaign-music-copy-btn" type="button" ${copyOptions.length === 0 ? 'disabled' : ''}>Копировать</button>
      </div>
    </div>
  `;
}


function getPendingUploadFilesHTML(
  files
) {

  if (files.length === 0) {

    return `
      <div class="campaign-music-upload-hint">
        Выбранные файлы появятся здесь. Нажми Добавить, чтобы положить их в текущий плейлист.
      </div>
    `;
  }

  return `
    <div class="campaign-music-upload-pending">
      Выбрано файлов: ${files.length}
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
    ? `Не удалось добавить песни: ${message}`
    : 'Не удалось добавить песни. Подробности смотри в консоли.';
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
  track
) {

  return `
    <div class="campaign-music-track-row" data-track-id="${escapeAttribute(track.trackId)}">
      <span>${escapeHTML(track.title)}</span>
      <button class="campaign-music-remove-track" type="button" data-track-id="${escapeAttribute(track.trackId)}" title="Убрать">×</button>
    </div>
  `;
}


function createSafeAudioFilename(
  name
) {

  const fallback =
    `track-${Date.now()}.mp3`;

  return String(name || fallback)
    .replaceAll('\\', '/')
    .split('/')
    .pop()
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ._ -]/g, '_')
    .trim() ||
    fallback;
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
        ? `Играет: ${track.title}`
        : 'В активном плейлисте нет песен'
    );

  } catch (error) {

    console.error(
      'Не удалось запустить музыку карты.',
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
  message
) {

  playbackStatusByMap.set(
    map,
    {
      state,
      message
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
    ? `Не удалось запустить музыку: ${message}`
    : 'Не удалось запустить музыку. Проверь формат файла и доступ к workspace.';
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
