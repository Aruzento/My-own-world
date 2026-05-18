import { state } from '../state.js';

import {
  parseMarkdown
} from '../core/markdown.js';

import {
  deletePageBranch,
  duplicatePageAsChild,
  writePageContent
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  isCampaignMapRecord
} from './campaignMapContract.js';

import {
  clamp
} from './campaignMapGeometry.js';

import {
  ensurePageDndHealth,
  updatePageDndHealth
} from './campaignMapHealth.js';

import {
  applyTokenRotation,
  applyTokenSize,
  positionToken,
  restoreTokenImage,
  setTokenFallbackText
} from './campaignMapTokens.js';

import {
  renderMapShape
} from './campaignMapShapes.js';


// Слой действий карты: операции, которые меняют карточки, дерево или сохраненное
// состояние. Всплывающие меню вызывают эти функции через маленький контракт.

export async function deleteTokenAndPage(
  token,
  deps
) {

  const pageId =
    token.dataset.pageId;

  const page =
    state.pages.find(candidate =>
      candidate.id === pageId
    );

  deps.closeTokenPopup();

  if (page) {

    try {

      const canWrite =
        await ensureWorkspaceWritePermission();

      if (!canWrite) {

        throw new Error(
          'Нет прав на изменение workspace'
        );
      }

      await deletePageBranch(
        page
      );

    } catch (error) {

      console.error(
        'Не удалось удалить токен и дочернюю карточку:',
        error
      );

      setStatus(
        'Не удалось удалить дочернюю карточку'
      );

      return;
    }
  }

  token.remove();
  renderTree();
  await deps.saveAndSync();
}


export function getTokenPage(
  token
) {

  return state.pages.find(candidate =>
    candidate.id === token?.dataset.pageId
  );
}


export async function openTokenCard(
  token,
  deps
) {

  const page =
    getTokenPage(
      token
    );

  if (!page) return;

  deps.closeTokenPopup();
  deps.clearDraggedToken(
    false
  );

  const editorModule =
    await import('./editor.js');

  editorModule.openPage(
    page
  );
}


export async function changeTokenHp(
  token,
  page,
  options,
  deps
) {

  const canWrite =
    await ensureWorkspaceWritePermission();

  if (!canWrite) {

    setStatus(
      'Нет прав на изменение workspace'
    );

    return;
  }

  const result =
    updatePageDndHealth(
      page,
      options
    );

  if (!result) {

    setStatus(
      'У карточки нет блока DnD с хитами'
    );

    return;
  }

  await writePageContent(
    page,
    page.content
  );

  deps.applyTokenHealthState(
    token
  );

  deps.closeTokenPopup();
  await deps.saveAndSync();

  setStatus(
    `Хиты изменены: ${result.current}/${result.max}`
  );
}


export async function duplicateTokenAndPage(
  token,
  deps
) {

  const tokenType =
    getNormalizedTokenType(
      token
    );

  const page =
    state.pages.find(candidate =>
      candidate.id === token.dataset.pageId
    );

  if (!page) return;

  refreshPageMetaFromContent(
    page
  );

  if (
    isCampaignMapRecord(
      page
    )
  ) {

    console.warn(
      'Дублирование токена отменено: дочерняя карточка распознана как карта.',
      page
    );

    setStatus(
      'Нельзя дублировать: карточка токена повреждена и распознана как карта'
    );

    deps.closeTokenPopup();
    return;
  }

  deps.closeTokenPopup();

  try {

    const canWrite =
      await ensureWorkspaceWritePermission();

    if (!canWrite) {

      throw new Error(
        'Нет прав на изменение workspace'
      );
    }

    const duplicate =
      await duplicatePageAsChild(
        page,
        page.parent
      );

    await normalizeDuplicatedTokenPage(
      duplicate,
      tokenType
    );

    const map =
      token.closest('.campaign-map-document');

    await addMapTokenFromExisting(
      map,
      token,
      duplicate,
      deps
    );

    renderTree();
    await deps.saveAndSync();

  } catch (error) {

    console.error(
      'Не удалось дублировать токен:',
      error
    );

    setStatus(
      'Не удалось дублировать токен'
    );
  }
}


export async function toggleMapItemPresentationVisibility(
  item,
  deps
) {

  const hidden =
    item.dataset.presentationHidden === 'true';

  item.dataset.presentationHidden =
    hidden
      ? 'false'
      : 'true';

  item.classList.toggle(
    'is-presentation-hidden',
    !hidden
  );

  deps.openTokenPopup(
    item
  );

  await deps.saveAndSync();
}


export async function deleteMapShape(
  shape,
  deps
) {

  deps.closeTokenPopup();
  shape.remove();
  await deps.saveAndSync();
}


export async function duplicateMapShape(
  shape,
  deps
) {

  const clone =
    shape.cloneNode(false);

  clone.className =
    'campaign-map-shape';

  [
    'shapeType',
    'x',
    'y',
    'w',
    'h',
    'points',
    'presentationHidden'
  ].forEach(key => {

    if (shape.dataset[key] !== undefined) {

      clone.dataset[key] =
        shape.dataset[key];
    }
  });

  clone.dataset.x =
    String(
      Number(shape.dataset.x || 0) + 24
    );

  clone.dataset.y =
    String(
      Number(shape.dataset.y || 0) + 24
    );

  clone.dataset.shapeId =
    crypto.randomUUID();

  shape.after(
    clone
  );

  renderMapShape(
    clone
  );

  deps.selectMapShape(
    clone
  );

  deps.closeTokenPopup();
  await deps.saveAndSync();
}


export function ensureTokenHasHealthBlock(
  token,
  deps
) {

  const page =
    getTokenPage(
      token
    );

  if (!page) return null;

  const health =
    ensurePageDndHealth(
      page
    );

  deps.applyTokenHealthState(
    token
  );

  return health;
}


async function addMapTokenFromExisting(
  map,
  sourceToken,
  page,
  deps
) {

  const layer =
    map?.querySelector('.campaign-map-object-layer');

  if (!layer || !page) return;

  const tokenType =
    getNormalizedTokenType(
      sourceToken
    );

  const token =
    document.createElement('button');

  token.className =
    `campaign-map-token is-${tokenType}`;

  token.type =
    'button';

  token.dataset.tokenId =
    crypto.randomUUID();

  token.dataset.tokenType =
    tokenType;

  token.dataset.pageId =
    page.id;

  token.dataset.name =
    page.title || sourceToken.dataset.name || '';

  token.dataset.x =
    String(
      clamp(
        Number(sourceToken.dataset.x || 50) + 2,
        0,
        100
      )
    );

  token.dataset.y =
    String(
      clamp(
        Number(sourceToken.dataset.y || 50) + 2,
        0,
        100
      )
    );

  token.dataset.size =
    sourceToken.dataset.size || '1';

  token.dataset.rotation =
    sourceToken.dataset.rotation || '0';

  if (sourceToken.dataset.imageAsset) {

    token.dataset.imageAsset =
      sourceToken.dataset.imageAsset;
  }

  setTokenFallbackText(
    token,
    token.dataset.tokenType
  );

  layer.appendChild(
    token
  );

  positionToken(
    token
  );

  applyTokenSize(
    token
  );

  applyTokenRotation(
    token
  );

  deps.applyTokenHealthState(
    token
  );

  await restoreTokenImage(
    token
  );
}


function getNormalizedTokenType(
  token
) {

  return token?.dataset.tokenType === 'object'
    ? 'object'
    : 'creature';
}


function refreshPageMetaFromContent(
  page
) {

  const parsed =
    parseMarkdown(
      page.content || ''
    );

  page.template =
    parsed.template;

  page.type =
    parsed.type;

  page.tags =
    parsed.tags;

  page.aliases =
    parsed.aliases;
}


async function normalizeDuplicatedTokenPage(
  page,
  tokenType
) {

  if (!page) return;

  page.template =
    'card';

  page.type =
    tokenType;

  page.tags =
    [
      ...new Set([
        'card',
        ...(page.tags || []).filter(tag =>
          tag !== 'campaign-map' &&
          tag !== 'campaignmap'
        ),
        tokenType
      ])
    ];

  page.content =
    page.content.replace(
      /^---[\s\S]*?---/,
      `---
id: ${page.id}
parent: ${page.parent ?? 'null'}
order: ${page.order ?? Date.now()}
tags: [${page.tags.join(', ')}]
template: card
type: ${tokenType}
aliases: [${(page.aliases || []).join(', ')}]
---`
    );

  await writePageContent(
    page,
    page.content
  );
}


async function ensureWorkspaceWritePermission() {

  if (!state.workspaceHandle) return false;

  if (!state.workspaceHandle.queryPermission) return true;

  const currentPermission =
    await state.workspaceHandle.queryPermission({
      mode: 'readwrite'
    });

  if (currentPermission === 'granted') return true;

  if (!state.workspaceHandle.requestPermission) return false;

  const requestedPermission =
    await state.workspaceHandle.requestPermission({
      mode: 'readwrite'
    });

  return requestedPermission === 'granted';
}
