import {
  syncPresentation,
  syncPresentationDragMeasure,
  syncPresentationItemById
} from './campaignMapPresentation.js';


const PRESENTATION_SYNC_INTERVAL = 80;

let presentationSyncFrame = null;
let presentationSyncTimeout = null;
let lastPresentationSyncAt = 0;
let livePresentationFrame = null;
const pendingPresentationItems = new Map();
let pendingPresentationMeasure = null;


// Синхронизация презентации вынесена отдельно, чтобы drag/resize не запускали
// тяжелое клонирование карты чаще нужного и не раздували основной файл карты.

export function scheduleLivePresentationSync(
  payload,
  measurePayload = null
) {

  if (payload) {

    const item =
      normalizeLiveSyncPayload(
        payload
      );

    if (item) {

      pendingPresentationItems.set(
        `${item.itemType}:${item.itemId}`,
        item
      );
    }
  }

  if (!measurePayload && payload?.measure) {

    pendingPresentationMeasure =
      payload.measure;
  }

  if (measurePayload) {

    pendingPresentationMeasure =
      measurePayload;
  }

  if (livePresentationFrame) return;

  livePresentationFrame =
    requestAnimationFrame(
      () => {

        livePresentationFrame =
          null;

        const items =
          [...pendingPresentationItems.values()];

        const measure =
          pendingPresentationMeasure;

        pendingPresentationItems.clear();
        pendingPresentationMeasure =
          null;

        items.forEach(nextItem => {

          syncPresentationItemById(
            nextItem.map,
            nextItem.itemType,
            nextItem.itemId
          );
        });

        if (measure) {

          syncPresentationDragMeasure(
            measure
          );
        }
      }
    );
}


function normalizeLiveSyncPayload(
  payload
) {

  // Контракт live-sync: карта + тип сущности + id.
  // DOM-элементы сюда больше не передаются.
  if (
    payload.map &&
    payload.itemType &&
    payload.itemId
  ) {

    return payload;
  }

  return null;
}


export function schedulePresentationSync() {

  const now =
    performance.now();

  const wait =
    Math.max(
      0,
      PRESENTATION_SYNC_INTERVAL - (now - lastPresentationSyncAt)
    );

  if (wait > 0) {

    if (presentationSyncTimeout) return;

    presentationSyncTimeout =
      setTimeout(
        () => {

          presentationSyncTimeout =
            null;

          schedulePresentationSync();
        },
        wait
      );

    return;
  }

  if (presentationSyncFrame) return;

  presentationSyncFrame =
    requestAnimationFrame(
      () => {

        presentationSyncFrame =
          null;

        lastPresentationSyncAt =
          performance.now();

        syncPresentation();
      }
    );
}
