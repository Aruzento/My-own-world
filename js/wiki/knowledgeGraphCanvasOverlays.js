import {
  setStatus
} from '../ui/ui.js';

import {
  openPopupAtPoint,
  registerPopup
} from '../ui/popupManager.js';

import {
  getEditableRelationshipType
} from './knowledgeGraphLabels.js';


const graphNodeMenuControllersByDocument =
  new WeakMap();

const graphConnectPopupControllersByDocument =
  new WeakMap();


export function getRuntimeGraphConnectState(
  documentElement,
  options = {}
) {

  const getPageTitle =
    typeof options.getPageTitle === 'function'
      ? options.getPageTitle
      : pageId => pageId;

  const activeSourceId =
    documentElement.dataset.currentKnowledgeGraphConnectSource ||
    '';

  const targetId =
    documentElement.dataset.currentKnowledgeGraphConnectTarget ||
    '';

  return {
    activeSourceId,
    sourceTitle:
      activeSourceId
        ? getPageTitle(
          activeSourceId
        )
        : '',
    targetId,
    targetTitle:
      targetId
        ? getPageTitle(
          targetId
        )
        : '',
    type:
      getEditableRelationshipType(
        documentElement.dataset.currentKnowledgeGraphConnectType ||
        'related'
      )
  };
}


export function setupKnowledgeGraphOverlayControllers(
  documentElement,
  options = {}
) {

  const nodeMenu =
    documentElement.querySelector(
      '[data-knowledge-graph-node-menu]'
    );

  if (nodeMenu) {

    ensureGraphNodeMenuController(
      documentElement,
      nodeMenu,
      options
    );
  }

  const connectPopup =
    documentElement.querySelector(
      '[data-knowledge-graph-connect-popup]'
    );

  if (connectPopup) {

    ensureGraphConnectPopupController(
      documentElement,
      connectPopup,
      options
    );
  }
}


function ensureGraphNodeMenuController(
  documentElement,
  menu,
  options = {}
) {

  const existing =
    graphNodeMenuControllersByDocument.get(
      documentElement
    );

  if (
    existing?.menu === menu
  ) {

    return existing.controller;
  }

  const controller =
    registerPopup({
      popup:
        menu,
      close:
        () => hideGraphNodeContextMenuElement(
          menu
        ),
      key:
        'knowledge-graph-node-menu',
      kind:
        'context-menu',
      modal:
        false
    });

  graphNodeMenuControllersByDocument.set(
    documentElement,
    {
      menu,
      controller
    }
  );

  return controller;
}


function ensureGraphConnectPopupController(
  documentElement,
  popup,
  options = {}
) {

  const existing =
    graphConnectPopupControllersByDocument.get(
      documentElement
    );

  if (
    existing?.popup === popup
  ) {

    return existing.controller;
  }

  const controller =
    registerPopup({
      popup,
      close:
        () => closeGraphConnectPopup(
          documentElement,
          options
        ),
      key:
        'knowledge-graph-connect-popup',
      kind:
        'dialog',
      modal:
        false
    });

  graphConnectPopupControllersByDocument.set(
    documentElement,
    {
      popup,
      controller
    }
  );

  return controller;
}


export function closeGraphConnectPopup(
  documentElement,
  options = {}
) {

  const popup =
    documentElement.querySelector(
      '[data-knowledge-graph-connect-popup]'
    );

  popup?.classList.add(
    'hidden'
  );

  const hadConnectState =
    Boolean(
      documentElement.dataset.currentKnowledgeGraphConnectSource
    );

  clearGraphConnectState(
    documentElement
  );

  if (hadConnectState) {

    setStatus(
      'Создание связи отменено'
    );
  }

  renderGraphFocus(
    documentElement,
    options
  );
}


export function toggleGraphNodeRelationshipsPanel(
  relationshipsToggle
) {

  const relationshipPanel =
    relationshipsToggle.closest(
      '.knowledge-graph-node-menu-relationship-panel'
    );

  if (!relationshipPanel) return;

  const isExpanded =
    relationshipPanel.dataset.knowledgeGraphRelationshipsExpanded === 'true';

  relationshipPanel.dataset.knowledgeGraphRelationshipsExpanded =
    isExpanded
      ? 'false'
      : 'true';

  relationshipsToggle.setAttribute(
    'aria-expanded',
    isExpanded
      ? 'false'
      : 'true'
  );
}


export function handleGraphConnectTypeChange(
  documentElement,
  value
) {

  documentElement.dataset.currentKnowledgeGraphConnectType =
    getEditableRelationshipType(
      value
    );
}


export async function handleGraphConnectAction(
  documentElement,
  action,
  options = {}
) {

  if (action === 'create') {

    const connectState =
      getRuntimeGraphConnectState(
        documentElement,
        options
      );

    const label =
      documentElement.querySelector(
        '[data-knowledge-graph-connect-label]'
      )?.value || '';

    const added =
      await options.addRelationship?.(
        documentElement,
        {
          sourceId:
            connectState.activeSourceId,
          targetId:
            connectState.targetId,
          type:
            connectState.type,
          label
        }
      );

    if (!added) return false;
  }

  if (
    action !== 'cancel' &&
    action !== 'create'
  ) {

    return false;
  }

  documentElement
    .querySelector(
      '[data-knowledge-graph-connect-popup]'
    )
    ?.classList.add(
      'hidden'
    );

  clearGraphConnectState(
    documentElement
  );

  setStatus(
    action === 'create'
      ? 'Связь добавлена'
      : 'Создание связи отменено'
  );

  renderGraphFocus(
    documentElement,
    options
  );

  return true;
}


export async function handleGraphCanvasNodeConnectClick(
  documentElement,
  targetId,
  options = {}
) {

  const connectState =
    getRuntimeGraphConnectState(
      documentElement,
      options
    );

  if (!connectState.activeSourceId) return false;

  if (
    !targetId ||
    connectState.activeSourceId === targetId
  ) {

    setStatus(
      'Выберите другую страницу для связи'
    );

    return true;
  }

  documentElement.dataset.currentKnowledgeGraphConnectTarget =
    targetId;

  setStatus(
    'Проверь свойства новой связи'
  );

  renderGraphFocus(
    documentElement,
    options
  );

  return true;
}


export async function handleGraphNodeMenuAction(
  documentElement,
  actionButton,
  options = {}
) {

  const menu =
    actionButton.closest(
      '[data-knowledge-graph-node-menu]'
    );

  const nodeId =
    menu?.dataset.nodeId;

  if (!nodeId) return false;

  const action =
    actionButton.dataset.knowledgeGraphNodeMenuAction;

  hideGraphNodeContextMenu(
    documentElement,
    options
  );

  if (action === 'open') {

    await options.openPage?.(
      nodeId
    );

    return true;
  }

  if (action === 'focus') {

    documentElement.dataset.currentKnowledgeGraphFocusNode =
      nodeId;
  }

  if (action === 'clear-focus') {

    delete documentElement.dataset.currentKnowledgeGraphFocusNode;
  }

  if (action === 'pin-position') {

    const card =
      options.findNodeCard?.(
        documentElement,
        nodeId
      );

    if (card) {

      options.persistPosition?.(
        documentElement,
        card
      );
    }
  }

  if (action === 'reset-position') {

    options.resetPosition?.(
      documentElement,
      nodeId
    );
  }

  if (action === 'connect') {

    documentElement.dataset.currentKnowledgeGraphConnectSource =
      nodeId;

    documentElement.dataset.currentKnowledgeGraphConnectType =
      documentElement.dataset.currentKnowledgeGraphConnectType ||
      'related';

    delete documentElement.dataset.currentKnowledgeGraphConnectTarget;

    setStatus(
      'Выберите цель связи на canvas'
    );
  }

  renderGraph(
    documentElement,
    options
  );

  return true;
}


export function showGraphNodeContextMenu(
  documentElement,
  card,
  clientX,
  clientY,
  options = {}
) {

  const menu =
    documentElement.querySelector(
      '[data-knowledge-graph-node-menu]'
    );

  if (!menu) return;

  const title =
    card.dataset.nodeTitle ||
    card.dataset.nodeId ||
    '';

  const titleElement =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-title]'
    );

  if (titleElement) {

    titleElement.textContent =
      title;
  }

  menu.dataset.nodeId =
    card.dataset.nodeId;

  menu.dataset.anchorX =
    String(
      Math.round(
        clientX
      )
    );

  menu.dataset.anchorY =
    String(
      Math.round(
        clientY
      )
    );

  const viewState =
    options.readViewState?.(
      documentElement
    ) || {
      positions:
        {}
    };

  const hasPinnedPosition =
    Boolean(
      viewState.positions?.[card.dataset.nodeId]
    );

  const pinButton =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-action="pin-position"]'
    );

  const resetButton =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-action="reset-position"]'
    );

  if (pinButton) {

    pinButton.hidden =
      hasPinnedPosition;
  }

  if (resetButton) {

    resetButton.hidden =
      !hasPinnedPosition;
  }

  const relationshipsElement =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-relationships]'
    );

  if (relationshipsElement) {

    relationshipsElement.innerHTML =
      options.getRelationshipsHTML?.(
        card.dataset.nodeId
      ) || '';
  }

  const relationshipCount =
    Number(
      options.getRelationshipCount?.(
        card.dataset.nodeId
      )
    ) || 0;

  const relationshipCountElement =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-relationship-count]'
    );

  if (relationshipCountElement) {

    relationshipCountElement.innerHTML =
      options.getRelationshipCountHTML?.(
        relationshipCount
      ) || '';

    relationshipCountElement.setAttribute(
      'aria-label',
      `${relationshipCount} ручных связей`
    );

    relationshipCountElement.setAttribute(
      'title',
      `${relationshipCount} ручных связей`
    );
  }

  const relationshipPanel =
    menu.querySelector(
      '.knowledge-graph-node-menu-relationship-panel'
    );

  if (relationshipPanel) {

    relationshipPanel.dataset.knowledgeGraphRelationshipsExpanded =
      'false';

    relationshipPanel
      .querySelector('[data-knowledge-graph-relationships-toggle]')
      ?.setAttribute(
        'aria-expanded',
        'false'
      );
  }

  menu.hidden =
    false;

  menu.classList.add(
    'hidden'
  );

  ensureGraphNodeMenuController(
    documentElement,
    menu,
    options
  );

  openPopupAtPoint(
    menu,
    clientX,
    clientY,
    {
      fallbackWidth: 336,
      fallbackHeight: 460
    }
  );
}


export function hideGraphNodeContextMenu(
  documentElement,
  options = {}
) {

  const menu =
    documentElement.querySelector(
      '[data-knowledge-graph-node-menu]'
    );

  if (!menu) return;

  const controller =
    ensureGraphNodeMenuController(
      documentElement,
      menu,
      options
    );

  if (
    controller?.isOpen()
  ) {

    controller.close();
    return;
  }

  hideGraphNodeContextMenuElement(
    menu
  );
}


function hideGraphNodeContextMenuElement(
  menu
) {

  menu.hidden =
    true;

  menu.classList.add(
    'hidden'
  );

  delete menu.dataset.nodeId;
  delete menu.dataset.anchorX;
  delete menu.dataset.anchorY;
}


export function isGraphOverlayEventTarget(
  target
) {

  return Boolean(
    target?.closest(
      '[data-knowledge-graph-node-menu], [data-knowledge-graph-connect-popup], [data-knowledge-graph-inspector]'
    )
  );
}


function clearGraphConnectState(
  documentElement
) {

  delete documentElement.dataset.currentKnowledgeGraphConnectSource;
  delete documentElement.dataset.currentKnowledgeGraphConnectType;
  delete documentElement.dataset.currentKnowledgeGraphConnectTarget;
}


function renderGraph(
  documentElement,
  options
) {

  if (typeof options.render === 'function') {

    options.render(
      documentElement
    );
  }
}


function renderGraphFocus(
  documentElement,
  options
) {

  if (typeof options.renderFocus === 'function') {

    options.renderFocus(
      documentElement,
      {
        force:
          true
      }
    );

    return;
  }

  renderGraph(
    documentElement,
    options
  );
}
