import {
  closePopup,
  registerPopup
} from './popupManager.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  EVENT_TYPES_V1
} from '../events/eventTypes.js';

import {
  EVENT_QUERY_MAX_LIMIT,
  getEventTransactionByIdFromSnapshot,
  queryEventLogFromSnapshot
} from '../events/eventQuery.js';

import {
  readTransactionRecords
} from '../events/eventStore.js';

import {
  classifyTransactionReversibility,
  undoTransaction
} from '../events/transactionReversal.js';


const EVENT_HISTORY_UI_VERSION =
  '0.0.1.15.9';

const EVENT_HISTORY_VISIBLE_LIMIT =
  50;

const EVENT_TYPE_LABELS =
  Object.freeze({
    [EVENT_TYPES_V1.ROLL_PERFORMED]:
      'Бросок',
    [EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED]:
      'Ручная коррекция',
    [EVENT_TYPES_V1.RESOURCE_CHANGED]:
      'Изменение ресурса',
    [EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED]:
      'Отмена'
  });

const EVENT_TYPE_ICONS =
  Object.freeze({
    [EVENT_TYPES_V1.ROLL_PERFORMED]:
      'calculator',
    [EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED]:
      'edit',
    [EVENT_TYPES_V1.RESOURCE_CHANGED]:
      'hash',
    [EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED]:
      'skip-back'
  });


export function setupEventHistoryPanel() {

  const trigger =
    document.getElementById('eventHistoryBtn');

  const popup =
    document.getElementById('eventHistoryPopup');

  const toolsButton =
    document.getElementById('appToolsBtn');

  if (
    !trigger ||
    !popup
  ) return;

  enhanceToolsTrigger(
    trigger
  );

  const closePanel =
    () => {

      trigger.setAttribute(
        'aria-expanded',
        'false'
      );

      closePopup(
        popup
      );
    };

  const controller =
    registerPopup({
      popup,
      close:
        closePanel,
      anchors:
        [
          trigger,
          toolsButton
        ].filter(Boolean),
      key:
        'event-history-popup',
      kind:
        'dialog',
      modal:
        true
    });

  trigger.addEventListener(
    'click',
    () => {

      closeToolsPopup();

      renderEventHistoryPopup({
        popup,
        controller
      });

      controller.open();

      trigger.setAttribute(
        'aria-expanded',
        'true'
      );
    }
  );
}


export function renderEventHistoryPopup({
  popup,
  controller,
  loadOptions = {}
} = {}) {

  if (!popup) return;

  popup.dataset.eventHistoryUi =
    EVENT_HISTORY_UI_VERSION;

  popup.replaceChildren();

  const body =
    createElement(
      'div',
      'event-history-body'
    );

  body.id =
    'eventHistoryBody';

  body.setAttribute(
    'role',
    'region'
  );

  body.setAttribute(
    'aria-label',
    'Список событий'
  );

  const statusStrip =
    createStatusStrip();

  const refreshButton =
    createIconButton({
      label:
        'Обновить журнал событий',
      icon:
        'repeat'
    });

  refreshButton.dataset.overlayAutofocus =
    'true';

  const closeButton =
    createIconButton({
      label:
        'Закрыть журнал событий',
      icon:
        'x',
      className:
        'app-popup-close'
    });

  refreshButton.addEventListener(
    'click',
    () => {

      void loadEventHistory({
        body,
        statusStrip,
        loadOptions
      });
    }
  );

  closeButton.addEventListener(
    'click',
    () => controller?.close()
  );

  popup.append(
    createHeader({
      refreshButton,
      closeButton
    }),
    statusStrip,
    body
  );

  void loadEventHistory({
    body,
    statusStrip,
    loadOptions
  });
}


export async function createEventHistoryViewModel(
  query = {},
  options = {}
) {

  const snapshot =
    await readTransactionRecords({
      storageAdapter:
        options.storageAdapter,
      strict:
        Boolean(
          options.strict
        )
    });

  const result =
    queryEventLogFromSnapshot(
      snapshot,
      {
        limit:
          EVENT_HISTORY_VISIBLE_LIMIT,
        ...query
      }
    );

  const reversibilitySource =
    result.returnedCount > 0
      ? queryEventLogFromSnapshot(
        snapshot,
        {
          limit:
            EVENT_QUERY_MAX_LIMIT
        }
      )
      : result;

  const transactionSummaries =
    collectTransactionSummaries(
      reversibilitySource.items
    );

  const transactionCache =
    new Map();

  const items =
    [];

  for (const item of result.items) {

    const transactionId =
      item.transaction.transactionId;

    let transaction =
      transactionCache.get(
        transactionId
      );

    if (transaction === undefined) {

      transaction =
        getEventTransactionByIdFromSnapshot(
          snapshot,
          transactionId
        );

      transactionCache.set(
        transactionId,
        transaction
      );
    }

    const reversibility =
      transaction
        ? classifyTransactionReversibility(
          transaction,
          transactionSummaries
        )
        : null;

    items.push(
      createEventHistoryItemModel({
        item,
        reversibility
      })
    );
  }

  return {
    kind:
      'mow-event-history-view-model',
    version:
      1,
    totalMatched:
      result.totalMatched,
    returnedCount:
      result.returnedCount,
    hasMore:
      result.hasMore,
    invalidRecordCount:
      result.invalidRecordCount,
    items
  };
}


async function loadEventHistory({
  body,
  statusStrip,
  loadOptions = {}
}) {

  renderLoading(
    body
  );

  renderStatusStrip(
    statusStrip,
    [
      {
        label:
          'Загрузка'
      }
    ]
  );

  try {

    const viewModel =
      await createEventHistoryViewModel(
        {},
        loadOptions
      );

    renderStatusStrip(
      statusStrip,
      createStatusChips(
        viewModel
      )
    );

    renderHistoryItems({
      body,
      viewModel,
      loadOptions,
      statusStrip
    });

  } catch (error) {

    renderStatusStrip(
      statusStrip,
      [
        {
          label:
            'Недоступно',
          tone:
            'warning'
        }
      ]
    );

    renderError(
      body,
      error
    );
  }
}


function renderHistoryItems({
  body,
  viewModel,
  loadOptions,
  statusStrip
}) {

  body.replaceChildren();

  if (!viewModel.items.length) {

    body.appendChild(
      createEmptyState()
    );

    return;
  }

  const list =
    createElement(
      'div',
      'event-history-list'
    );

  list.setAttribute(
    'role',
    'list'
  );

  list.setAttribute(
    'aria-label',
    'Последние события'
  );

  for (const item of viewModel.items) {

    list.appendChild(
      createEventItem({
        item,
        loadOptions,
        statusStrip,
        body
      })
    );
  }

  body.appendChild(
    list
  );
}


function createEventItem({
  item,
  loadOptions,
  statusStrip,
  body
}) {

  const row =
    createElement(
      'article',
      'event-history-item'
    );

  row.dataset.eventType =
    item.eventType;

  row.dataset.eventHistoryItem =
    'true';

  row.dataset.transactionId =
    item.transactionId;

  row.dataset.eventId =
    item.eventId;

  if (item.relation) {

    row.dataset.eventReversal =
      item.relation.includes('Отмен');
  }

  row.setAttribute(
    'role',
    'listitem'
  );

  const meta =
    createElement(
      'div',
      'event-history-item-meta'
    );

  meta.append(
    createTextElement(
      'span',
      'event-history-item-order',
      `#${item.logOrder}`
    ),
    createTextElement(
      'span',
      'event-history-item-time',
      item.timeLabel
    )
  );

  const mark =
    createElement(
      'span',
      'event-history-item-mark'
    );

  mark.setAttribute(
    'aria-hidden',
    'true'
  );

  mark.innerHTML =
    iconSvg(
      item.icon,
      'app-icon',
      {
        size:
          'sm'
      }
    );

  const main =
    createElement(
      'div',
      'event-history-item-main'
    );

  const title =
    createElement(
      'div',
      'event-history-item-title'
    );

  title.append(
    createTextElement(
      'span',
      'event-history-item-type',
      item.typeLabel
    ),
    createTextElement(
      'span',
      'event-history-item-label',
      item.label
    )
  );

  const summary =
    createTextElement(
      'div',
      'event-history-item-summary',
      item.summary
    );

  summary.dataset.eventHistorySummary =
    'true';

  main.append(
    title,
    summary
  );

  if (item.relation) {

    const relation =
      createTextElement(
        'div',
        'event-history-item-relation',
        item.relation
      );

    relation.dataset.eventHistoryRelation =
      'true';

    main.appendChild(
      relation
    );
  }

  const actions =
    createElement(
      'div',
      'event-history-actions'
    );

  if (item.canUndo) {

    const undoButton =
      createButton({
        label:
          'Отменить изменение ресурса',
        variant:
          'ghost'
      });

    undoButton.dataset.eventHistoryUndo =
      'true';

    undoButton.addEventListener(
      'click',
      () => {

        void handleUndo({
          transactionId:
            item.transactionId,
          button:
            undoButton,
          loadOptions,
          statusStrip,
          body
        });
      }
    );

    actions.appendChild(
      undoButton
    );
  }

  row.append(
    meta,
    mark,
    main,
    actions
  );

  return row;
}


async function handleUndo({
  transactionId,
  button,
  loadOptions,
  statusStrip,
  body
}) {

  button.disabled =
    true;

  button.dataset.loading =
    'true';

  button.textContent =
    'Отмена...';

  renderStatusStrip(
    statusStrip,
    [
      {
        label:
          'Записываю отмену'
      }
    ]
  );

  const now =
    new Date().toISOString();

  try {

    await undoTransaction(
      {
        transactionId,
        reversalTransactionId:
          createEventHistoryId(
            'txn-event-history-undo'
          ),
        reversalEventId:
          createEventHistoryId(
            'evt-event-history-undo'
          ),
        reversalMetadataEventId:
          createEventHistoryId(
            'evt-event-history-undo-meta'
          ),
        createdAt:
          now,
        eventCreatedAt:
          now,
        completedAt:
          now,
        order:
          Date.now(),
        label:
          'Отмена изменения ресурса',
        source:
          'event-history-ui',
        reason:
          'event-history-undo'
      },
      loadOptions
    );

    await loadEventHistory({
      body,
      statusStrip,
      loadOptions
    });

  } catch (error) {

    renderStatusStrip(
      statusStrip,
      [
        {
          label:
            'Отмена не выполнена',
          tone:
            'warning'
        }
      ]
    );

    renderUndoError(
      body,
      error
    );
  }
}


function createHeader({
  refreshButton,
  closeButton
}) {

  const header =
    createElement(
      'header',
      'event-history-header'
    );

  const mark =
    createElement(
      'span',
      'event-history-mark'
    );

  mark.setAttribute(
    'aria-hidden',
    'true'
  );

  mark.innerHTML =
    iconSvg(
      'document',
      'app-icon'
    );

  const titleBlock =
    createElement(
      'div',
      'event-history-title-block'
    );

  titleBlock.append(
    createTextElement(
      'div',
      'event-history-kicker',
      'История'
    )
  );

  const title =
    createTextElement(
      'h2',
      '',
      'Журнал событий'
    );

  title.id =
    'eventHistoryTitle';

  const summary =
    createTextElement(
      'p',
      'event-history-summary',
      'Последние броски и изменения, записанные как транзакции.'
    );

  titleBlock.append(
    title,
    summary
  );

  const actions =
    createElement(
      'div',
      'event-history-header-actions'
    );

  actions.append(
    refreshButton,
    closeButton
  );

  header.append(
    mark,
    titleBlock,
    actions
  );

  return header;
}


function createStatusStrip() {

  const statusStrip =
    createElement(
      'div',
      'event-history-status-strip'
    );

  statusStrip.setAttribute(
    'role',
    'status'
  );

  statusStrip.setAttribute(
    'aria-live',
    'polite'
  );

  return statusStrip;
}


function renderStatusStrip(
  statusStrip,
  chips
) {

  statusStrip.replaceChildren(
    ...chips.map(chip => {

      const item =
        createTextElement(
          'span',
          'event-history-status-chip',
          chip.label
        );

      if (chip.tone) {

        item.dataset.tone =
          chip.tone;
      }

      return item;
    })
  );
}


function createStatusChips(
  viewModel
) {

  const chips =
    [
      {
        label:
          `${viewModel.returnedCount} из ${viewModel.totalMatched} событий`
      }
    ];

  if (viewModel.hasMore) {

    chips.push({
      label:
        'Есть более ранние события'
    });
  }

  if (viewModel.invalidRecordCount > 0) {

    chips.push({
      label:
        `${viewModel.invalidRecordCount} поврежденных записей`,
      tone:
        'warning'
    });
  }

  return chips;
}


function renderLoading(
  body
) {

  body.replaceChildren(
    createTextElement(
      'div',
      'event-history-loading',
      'Загружаю журнал событий...'
    )
  );
}


function createEmptyState() {

  const empty =
    createElement(
      'section',
      'event-history-empty'
    );

  const content =
    createElement(
      'div',
      ''
    );

  content.append(
    createTextElement(
      'h3',
      '',
      'История пока пустая'
    ),
    createTextElement(
      'p',
      '',
      'Когда появятся броски или безопасные изменения ресурсов, они будут показаны здесь.'
    )
  );

  empty.appendChild(
    content
  );

  return empty;
}


function renderError(
  body,
  error
) {

  body.replaceChildren(
    createErrorBlock({
      title:
        'Журнал событий недоступен',
      message:
        getReadableLoadError(
          error
        )
    })
  );
}


function renderUndoError(
  body,
  error
) {

  body.prepend(
    createErrorBlock({
      title:
        'Не удалось отменить событие',
      message:
        getReadableUndoError(
          error
        )
    })
  );
}


function createErrorBlock({
  title,
  message
}) {

  const block =
    createElement(
      'section',
      'event-history-error'
    );

  block.setAttribute(
    'role',
    'alert'
  );

  const content =
    createElement(
      'div',
      ''
    );

  content.append(
    createTextElement(
      'h3',
      '',
      title
    ),
    createTextElement(
      'p',
      '',
      message
    )
  );

  block.appendChild(
    content
  );

  return block;
}


function createEventHistoryItemModel({
  item,
  reversibility
}) {

  const event =
    item.event;

  const transaction =
    item.transaction;

  const relation =
    formatRelation({
      event,
      transaction
    });

  return {
    logOrder:
      item.logOrder,
    transactionId:
      transaction.transactionId,
    eventId:
      event.eventId,
    eventType:
      event.type,
    typeLabel:
      EVENT_TYPE_LABELS[event.type] || 'Событие',
    icon:
      EVENT_TYPE_ICONS[event.type] || 'document',
    timeLabel:
      formatTimestamp(
        event.createdAt || transaction.createdAt
      ),
    label:
      transaction.label ||
      createFallbackLabel(
        event
      ),
    summary:
      summarizeEvent(
        event
      ),
    relation,
    canUndo:
      event.type === EVENT_TYPES_V1.RESOURCE_CHANGED &&
      reversibility?.reversible === true &&
      reversibility.originalEventId === event.eventId
  };
}


function summarizeEvent(
  event
) {

  if (event.type === EVENT_TYPES_V1.ROLL_PERFORMED) {

    return summarizeRollEvent(
      event
    );
  }

  if (event.type === EVENT_TYPES_V1.RESOURCE_CHANGED) {

    return summarizeResourceChange(
      event
    );
  }

  if (event.type === EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED) {

    return summarizeManualCorrection(
      event
    );
  }

  if (event.type === EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED) {

    return summarizeTransactionReversal(
      event
    );
  }

  return 'Событие записано в журнал.';
}


function summarizeRollEvent(
  event
) {

  const roll =
    event.payload?.roll || {};

  const request =
    roll.request || {};

  const formula =
    request.formulaOriginal ||
    request.formulaNormalized ||
    'формула не указана';

  const parts =
    [
      `Формула ${formula}`,
      `итог ${formatScalar(roll.total)}`
    ];

  const dice =
    summarizeDiceTerms(
      roll.dice
    );

  if (dice) {

    parts.push(
      dice
    );
  }

  const critical =
    summarizeCritical(
      roll.critical
    );

  if (critical) {

    parts.push(
      critical
    );
  }

  return `${parts.join('; ')}.`;
}


function summarizeResourceChange(
  event
) {

  const payload =
    event.payload || {};

  const resource =
    payload.resource || {};

  const name =
    resource.label ||
    resource.id ||
    'Ресурс';

  const unit =
    payload.unit
      ? ` ${payload.unit}`
      : '';

  return `${name}: ${formatScalar(payload.before)} -> ${formatScalar(payload.after)}${unit}.`;
}


function summarizeManualCorrection(
  event
) {

  const payload =
    event.payload || {};

  const subject =
    payload.subject || {};

  const subjectLabel =
    subject.label ||
    subject.id ||
    'Объект';

  return `${subjectLabel}, ${payload.field || 'поле'}: ${formatScalar(payload.before)} -> ${formatScalar(payload.after)}.`;
}


function summarizeTransactionReversal(
  event
) {

  const payload =
    event.payload || {};

  return `Записана отмена транзакции ${shortId(payload.originalTransactionId)}.`;
}


function summarizeDiceTerms(
  diceTerms
) {

  if (
    !Array.isArray(
      diceTerms
    ) ||
    diceTerms.length === 0
  ) {

    return '';
  }

  return diceTerms
    .map(term => {

      const faces =
        Array.isArray(term.faces)
          ? term.faces.join(', ')
          : '';

      return `${term.count || 1}d${term.sides}: [${faces}]`;
    })
    .join('; ');
}


function summarizeCritical(
  critical
) {

  if (
    !critical ||
    critical.kind === 'none'
  ) {

    return '';
  }

  if (critical.kind === 'success') {

    return 'критический успех';
  }

  if (critical.kind === 'failure') {

    return 'критическая неудача';
  }

  return '';
}


function formatRelation({
  event,
  transaction
}) {

  if (event.reversesEventId) {

    return `Отменяет событие ${shortId(event.reversesEventId)}.`;
  }

  if (transaction.reversesTransactionId) {

    return `Отменяет транзакцию ${shortId(transaction.reversesTransactionId)}.`;
  }

  if (transaction.reversedByTransactionId) {

    return `Отменено транзакцией ${shortId(transaction.reversedByTransactionId)}.`;
  }

  if (event.type === EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED) {

    return `Связь отмены: ${shortId(event.payload?.originalTransactionId)} -> ${shortId(event.payload?.reversalTransactionId)}.`;
  }

  return '';
}


function collectTransactionSummaries(
  items
) {

  const byId =
    new Map();

  for (const item of items) {

    const id =
      item.transaction?.transactionId;

    if (
      id &&
      !byId.has(
        id
      )
    ) {

      byId.set(
        id,
        item.transaction
      );
    }
  }

  return [
    ...byId.values()
  ];
}


function createFallbackLabel(
  event
) {

  if (event.type === EVENT_TYPES_V1.ROLL_PERFORMED) {

    return 'Бросок кубиков';
  }

  if (event.type === EVENT_TYPES_V1.RESOURCE_CHANGED) {

    return 'Изменение ресурса';
  }

  if (event.type === EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED) {

    return 'Ручная коррекция';
  }

  if (event.type === EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED) {

    return 'Отмена транзакции';
  }

  return event.type || 'Событие';
}


function formatTimestamp(
  value
) {

  const parsed =
    Date.parse(
      value
    );

  if (!Number.isFinite(parsed)) {

    return 'Без времени';
  }

  return new Intl.DateTimeFormat(
    'ru-RU',
    {
      day:
        '2-digit',
      month:
        '2-digit',
      hour:
        '2-digit',
      minute:
        '2-digit'
    }
  ).format(
    new Date(
      parsed
    )
  );
}


function formatScalar(
  value
) {

  if (typeof value === 'number') {

    if (Number.isInteger(value)) {

      return String(
        value
      );
    }

    return String(
      Number(
        value.toFixed(4)
      )
    );
  }

  if (typeof value === 'string') {

    return value;
  }

  if (value === null || value === undefined) {

    return 'не указано';
  }

  return JSON.stringify(
    value
  );
}


function shortId(
  value
) {

  const text =
    String(value || '').trim();

  if (!text) return 'не указана';

  if (text.length <= 14) return text;

  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}


function getReadableLoadError(
  error
) {

  const message =
    String(error?.message || '');

  if (
    /workspace/i.test(message) ||
    /workspace/i.test(String(error?.cause?.message || '')) ||
    /выбран|выберите/i.test(message)
  ) {

    return 'Выберите workspace, чтобы увидеть его журнал событий.';
  }

  return 'Не удалось прочитать журнал. История не изменялась.';
}


function getReadableUndoError(
  error
) {

  const code =
    String(error?.code || '');

  if (code.includes('ALREADY_REVERSED')) {

    return 'Это изменение уже отменено. История не была изменена повторно.';
  }

  if (code.includes('CURRENT_STATE_CONFLICT')) {

    return 'Текущее значение уже изменилось, поэтому автоматическая отмена заблокирована.';
  }

  if (code.includes('NOT_REVERSIBLE')) {

    return 'Это событие нельзя отменить в текущем безопасном контракте.';
  }

  return 'Отмена не была записана. Проверьте текущее состояние страницы и попробуйте снова.';
}


function enhanceToolsTrigger(
  trigger
) {

  trigger.dataset.eventHistoryToolAction =
    'true';

  trigger.innerHTML =
    `
      <span class="mow-tools-action-icon">${iconSvg('document', 'app-icon', { size: 'sm' })}</span>
      <span class="mow-tools-action-copy">
        <span>Журнал событий</span>
        <small>Броски и изменения</small>
      </span>
    `;
}


function closeToolsPopup() {

  const toolsPopup =
    document.getElementById('appToolsPopup');

  const toolsButton =
    document.getElementById('appToolsBtn');

  if (toolsButton) {

    toolsButton.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  if (toolsPopup) {

    closePopup(
      toolsPopup
    );
  }
}


function createIconButton({
  label,
  icon,
  className =
    'mow-icon-button'
}) {

  const button =
    document.createElement('button');

  button.className =
    className;

  button.type =
    'button';

  button.title =
    label;

  button.setAttribute(
    'aria-label',
    label
  );

  button.innerHTML =
    iconSvg(
      icon,
      'app-icon'
    );

  return button;
}


function createButton({
  label,
  variant =
    ''
}) {

  const button =
    document.createElement('button');

  button.className =
    'mow-button';

  button.type =
    'button';

  if (variant) {

    button.dataset.variant =
      variant;
  }

  button.textContent =
    label;

  return button;
}


function createTextElement(
  tagName,
  className,
  text
) {

  const element =
    createElement(
      tagName,
      className
    );

  element.textContent =
    text;

  return element;
}


function createElement(
  tagName,
  className
) {

  const element =
    document.createElement(
      tagName
    );

  if (className) {

    element.className =
      className;
  }

  return element;
}


function createEventHistoryId(
  prefix
) {

  if (globalThis.crypto?.randomUUID) {

    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}
