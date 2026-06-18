import {
  setStatus
} from '../ui/ui.js';


export function isInternalRulePage(
  parsedOrPage
) {

  return parsedOrPage?.template === 'internalRule' ||
    parsedOrPage?.type === 'internalRule' ||
    parsedOrPage?.source === 'internalRulesWorkspace';
}


export function renderInternalRulePage(
  editor
) {

  editor
    .querySelectorAll(
      '[contenteditable="true"]'
    )
    .forEach(element => {

      element.setAttribute(
        'contenteditable',
        'false'
      );
    });

  editor
    .querySelectorAll(
      'input, textarea, select, button'
    )
    .forEach(element => {

      element.disabled =
        true;
    });

  setStatus(
    'Открыто внутреннее правило'
  );
}
