import {
  arePageStateIdentitiesEqual,
  createPageStateIdentityFromContent,
  createPageStateIdentityFromPage,
  normalizePageStateIdentity
} from '../core/pageRecord.js';

import {
  getStorageAdapter
} from './storageAdapter.js';


export async function readCurrentDurablePageStateIdentity(
  page,
  options = {}
) {

  const storageAdapter =
    options.storageAdapter || getStorageAdapter();

  const content =
    page?.path && typeof storageAdapter?.readText === 'function'
      ? await storageAdapter.readText(
        page.path
      )
      : page?.content;

  return createPageStateIdentityFromContent(
    content || '',
    {
      pageId:
        page?.id || null,
      source:
        page?.path
          ? 'storage'
          : 'runtime'
    }
  );
}


export async function evaluatePageWritePrecondition({
  page,
  expectedBase = null,
  storageAdapter = null
} = {}) {

  const expected =
    normalizePageStateIdentity(
      expectedBase
    );

  if (!expected) {

    return {
      status:
        'not-provided',
      ok:
        true,
      expectedBase:
        null,
      currentBase:
        null
    };
  }

  try {

    const currentBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            storageAdapter || getStorageAdapter()
        }
      );

    const ok =
      arePageStateIdentitiesEqual(
        expected,
        currentBase
      );

    return {
      status:
        ok
          ? 'matched'
          : 'mismatch',
      ok,
      expectedBase:
        expected,
      currentBase:
        normalizePageStateIdentity(
          currentBase
        )
    };

  } catch (error) {

    return {
      status:
        'read-failed',
      ok:
        false,
      expectedBase:
        expected,
      currentBase:
        null,
      error:
        String(
          error?.message || error || 'Unable to read current page state.'
        )
    };
  }
}


export function createPageWriteExpectedBase(
  page
) {

  return normalizePageStateIdentity(
    createPageStateIdentityFromPage(
      page
    )
  );
}
