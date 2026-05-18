import {
  syncPresentation,
  syncPresentationDragMeasure,
  syncPresentationItem
} from './campaignMapPresentation.js';


const PRESENTATION_SYNC_INTERVAL = 80;

let presentationSyncFrame = null;
let presentationSyncTimeout = null;
let lastPresentationSyncAt = 0;
let livePresentationFrame = null;
const pendingPresentationItems = new Set();
const pendingPresentationMeasureStages = new Set();


// Синхронизация презентации вынесена отдельно, чтобы drag/resize не запускали
// тяжелое клонирование карты чаще нужного и не раздували основной файл карты.

export function scheduleLivePresentationSync(
  item,
  stage = null
) {

  if (item) {

    pendingPresentationItems.add(
      item
    );
  }

  if (stage) {

    pendingPresentationMeasureStages.add(
      stage
    );
  }

  if (livePresentationFrame) return;

  livePresentationFrame =
    requestAnimationFrame(
      () => {

        livePresentationFrame =
          null;

        const items =
          [...pendingPresentationItems];

        const stages =
          [...pendingPresentationMeasureStages];

        pendingPresentationItems.clear();
        pendingPresentationMeasureStages.clear();

        items.forEach(nextItem => {

          syncPresentationItem(
            nextItem
          );
        });

        stages.forEach(nextStage => {

          syncPresentationDragMeasure(
            nextStage
          );
        });
      }
    );
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
