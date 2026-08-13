import {
  readFile
} from 'node:fs/promises';

import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';


const PROJECT_PLAN_PATH =
  normalizePath(
    path.join(
      'docs',
      '01-delivery',
      'PROJECT_PLAN.md'
    )
  );

const PRODUCT_DASHBOARD_PATH =
  normalizePath(
    path.join(
      'docs',
      '00-product',
      'PRODUCT_DASHBOARD.md'
    )
  );

const BUG_INVENTORY_PATH =
  normalizePath(
    path.join(
      'docs',
      '01-delivery',
      'BUG_INVENTORY.md'
    )
  );

const RELEASE_NOTES_PATH =
  normalizePath(
    path.join(
      'release',
      'latest',
      'release-notes.md'
    )
  );


if (isMainModule()) {

  const drift =
    await collectDocsStatusDrift({
      root:
        process.cwd()
    });

  printDocsStatusDrift(
    drift
  );

  if (drift.length) {

    process.exitCode =
      1;
  }
}


export async function collectDocsStatusDrift({
  root = process.cwd()
} = {}) {

  const plan =
    await readRequiredDocument(
      root,
      PROJECT_PLAN_PATH
    );

  const planStatus =
    parseProjectPlanStatus(
      plan
    );

  const drift =
    [];

  if (!planStatus.activePhase) {

    drift.push({
      file:
        PROJECT_PLAN_PATH,
      message:
        'PROJECT_PLAN current phase was not found.'
    });

    return drift;
  }

  await compareProductDashboard(
    root,
    planStatus,
    drift
  );

  await compareActivePhasePointer(
    root,
    BUG_INVENTORY_PATH,
    /Current next step:\s*`([^`]+)`/,
    planStatus.activePhase,
    drift
  );

  await compareActivePhasePointer(
    root,
    RELEASE_NOTES_PATH,
    /active project phase is(?: the)?(?: [^`.\n]+)?\s*`([^`]+)`/i,
    planStatus.activePhase,
    drift
  );

  return drift;
}


export function parseProjectPlanStatus(
  content
) {

  const activePhase =
    content.match(
      /^Current phase:\s*`([^`]+)`/m
    )?.[1] || '';

  const stopNote =
    content
      .split(/\r?\n/)
      .find(line =>
        line.startsWith(
          'Important stop note:'
        )
      ) || '';

  const closedSlice =
    stopNote.includes(
      ' are closed.'
    )
      ? stopNote.slice(
          0,
          stopNote.indexOf(
            ' are closed.'
          )
        )
      : stopNote;

  return {
    activePhase,
    closedCleanupLeaves:
      extractRcbIds(
        closedSlice
      )
  };
}


export function extractRcbIds(
  value
) {

  return [
    ...new Set(
      [...String(value).matchAll(/\bRCB-\d+[A-Z]?\b/g)]
        .map(match =>
          match[0]
        )
    )
  ];
}


export function printDocsStatusDrift(
  drift
) {

  console.log(
    `Docs status drift: ${drift.length}`
  );

  for (const item of drift) {

    console.log(
      `- ${item.file}: ${item.message}`
    );
  }

  if (!drift.length) {

    console.log(
      'Docs status guard OK.'
    );
  }
}


async function compareProductDashboard(
  root,
  planStatus,
  drift
) {

  const content =
    await readOptionalDocument(
      root,
      PRODUCT_DASHBOARD_PATH
    );

  if (!content) return;

  compareActivePhaseValue({
    file:
      PRODUCT_DASHBOARD_PATH,
    label:
      'Immediate direction cleanup phase',
    actual:
      content.match(
        /Continue\s+`([^`]+)`\s+cleanup only one RCB leaf at a time\./
      )?.[1],
    expected:
      planStatus.activePhase,
    drift
  });

  compareActivePhaseValue({
    file:
      PRODUCT_DASHBOARD_PATH,
    label:
      'Next owner action cleanup phase',
    actual:
      content.match(
        /Choose the next\s+`([^`]+)`\s+RCB leaf/
      )?.[1],
    expected:
      planStatus.activePhase,
    drift
  });

  const dashboardClosedLine =
    content
      .split(/\r?\n/)
      .find(line =>
        line.includes(
          'Closed cleanup leaves so far:'
        )
      );

  if (dashboardClosedLine) {

    const dashboardClosedText =
      dashboardClosedLine
        .split(
          'Closed cleanup leaves so far:'
        )[1]
        ?.split('.')[0] || dashboardClosedLine;

    const dashboardClosed =
      extractRcbIds(
        dashboardClosedText
      );

    if (
      !sameOrderedValues(
        dashboardClosed,
        planStatus.closedCleanupLeaves
      )
    ) {

      drift.push({
        file:
          PRODUCT_DASHBOARD_PATH,
        message:
          `Closed cleanup leaves differ from PROJECT_PLAN. expected=[${planStatus.closedCleanupLeaves.join(', ')}] actual=[${dashboardClosed.join(', ')}]`
      });
    }
  }
}


async function compareActivePhasePointer(
  root,
  file,
  pattern,
  expected,
  drift
) {

  const content =
    await readOptionalDocument(
      root,
      file
    );

  if (!content) return;

  const actual =
    content.match(
      pattern
    )?.[1];

  compareActivePhaseValue({
    file,
    label:
      'active plan pointer',
    actual,
    expected,
    drift
  });
}


function compareActivePhaseValue({
  file,
  label,
  actual,
  expected,
  drift
}) {

  if (!actual) return;

  if (actual !== expected) {

    drift.push({
      file,
      message:
        `${label} points to ${actual}, but PROJECT_PLAN current phase is ${expected}.`
    });
  }
}


async function readRequiredDocument(
  root,
  relativePath
) {

  return readFile(
    path.join(
      root,
      relativePath
    ),
    'utf8'
  );
}


async function readOptionalDocument(
  root,
  relativePath
) {

  try {

    return await readRequiredDocument(
      root,
      relativePath
    );

  } catch (error) {

    if (error?.code === 'ENOENT') return '';

    throw error;
  }
}


function sameOrderedValues(
  left,
  right
) {

  return left.length === right.length &&
    left.every((value, index) =>
      value === right[index]
    );
}


function normalizePath(
  value
) {

  return value.replaceAll(
    path.sep,
    '/'
  );
}


function isMainModule() {

  return fileURLToPath(
    import.meta.url
  ) === process.argv[1];
}
