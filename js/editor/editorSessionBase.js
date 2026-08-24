import {
  createPageStateIdentityFromContent,
  normalizePageStateIdentity
} from '../core/pageRecord.js';


let currentEditorPageBase =
  null;


export function captureEditorPageBase(
  page,
  content = page?.content
) {

  currentEditorPageBase =
    createEditorPageBase(
      page,
      content
    );

  return currentEditorPageBase;
}


export function getCurrentEditorPageBase(
  pageId = null
) {

  if (
    pageId &&
    currentEditorPageBase?.pageId !== pageId
  ) {

    return null;
  }

  return currentEditorPageBase;
}


export function advanceEditorPageBase(
  page,
  content = page?.content
) {

  currentEditorPageBase =
    createEditorPageBase(
      page,
      content
    );

  return currentEditorPageBase;
}


export function clearEditorPageBase(
  pageId = null
) {

  if (
    pageId &&
    currentEditorPageBase?.pageId !== pageId
  ) return;

  currentEditorPageBase =
    null;
}


function createEditorPageBase(
  page,
  content
) {

  if (!page) return null;

  return normalizePageStateIdentity(
    createPageStateIdentityFromContent(
      content || '',
      {
        pageId:
          page.id || null,
        source:
          'editor-session'
      }
    )
  );
}
