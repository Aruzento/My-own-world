import {
  normalizeWikiLinksInEditor
} from './wikiLinks.js';

export function setupEditorWikiLinkNormalization(
  editor,
  options
) {

  let wikiLinkNormalizeTimer =
    null;

  function scheduleWikiLinkNormalization() {

    clearTimeout(
      wikiLinkNormalizeTimer
    );

    wikiLinkNormalizeTimer =
      setTimeout(
        () => {

          const changed =
            normalizeWikiLinksInEditor(
              editor
            );

          if (changed) {

            options.saveCurrentPage();
          }
        },
        80
      );
  }

  editor.addEventListener(
    'input',
    () => {

      options.onInput();

      scheduleWikiLinkNormalization();
    }
  );

  return {
    scheduleWikiLinkNormalization
  };
}
