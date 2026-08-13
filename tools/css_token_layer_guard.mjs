import {
  readFileSync
} from 'node:fs';

import {
  join
} from 'node:path';

import {
  fileURLToPath
} from 'node:url';


export const DEFAULT_TOKEN_FILES = [
  'styles/design-tokens.css'
];

export const DEFAULT_TARGET_CSS_FILES = [
  'styles/command-palette.css',
  'styles/app-topbar.css',
  'styles/card-type.css'
];

export const OVERLAY_LAYER_TOKENS = new Set([
  '--mow-z-dropdown',
  '--mow-z-popover',
  '--mow-z-modal',
  '--mow-z-toast'
]);

const EXTREME_Z_INDEX_THRESHOLD =
  1000;


if (isMainModule()) {

  const issues =
    collectCssTokenLayerDrift();

  if (issues.length > 0) {

    console.error(
      'CSS token/layer guard failed:'
    );

    issues.forEach(issue => {

      console.error(
        `- ${formatCssTokenLayerIssue(issue)}`
      );
    });

    process.exit(
      1
    );
  }

  console.log(
    `CSS token/layer guard passed: ${DEFAULT_TARGET_CSS_FILES.length} focused CSS files`
  );
}


export function collectCssTokenLayerDrift({
  root = process.cwd(),
  files = DEFAULT_TARGET_CSS_FILES,
  tokenFiles = DEFAULT_TOKEN_FILES,
  fileContents = null
} = {}) {

  const texts =
    new Map();

  [
    ...new Set([
      ...tokenFiles,
      ...files
    ])
  ]
    .forEach(file => {

      texts.set(
        normalizePath(
          file
        ),
        stripCommentsPreserveLines(
          readCssText({
            root,
            file,
            fileContents
          })
        )
      );
    });

  const definedTokens =
    collectDefinedMowTokens(
      texts
    );

  const issues =
    [];

  files
    .map(normalizePath)
    .forEach(file => {

      const text =
        texts.get(
          file
        ) || '';

      issues.push(
        ...collectUndefinedTokenUsages({
          file,
          text,
          definedTokens
        }),
        ...collectExtremeZIndexUsages({
          file,
          text
        })
      );
    });

  return issues;
}


export function formatCssTokenLayerIssue(
  issue
) {

  return `${issue.file}:${issue.line} ${issue.message}`;
}


function collectDefinedMowTokens(
  texts
) {

  const definitions =
    new Set();

  for (const text of texts.values()) {

    const pattern =
      /(^|[;{}\s])(--mow-[\w-]+)\s*:/g;

    let match;

    while ((match = pattern.exec(text)) !== null) {

      definitions.add(
        match[2]
      );
    }
  }

  return definitions;
}


function collectUndefinedTokenUsages({
  file,
  text,
  definedTokens
}) {

  return collectVarCalls(
    text
  )
    .filter(call =>
      call.token?.startsWith(
        '--mow-'
      )
    )
    .filter(call =>
      !call.hasFallback
    )
    .filter(call =>
      !definedTokens.has(
        call.token
      )
    )
    .map(call => ({
      type:
        'undefined-mow-token',
      file,
      line:
        getLineNumber(
          text,
          call.index
        ),
      token:
        call.token,
      message:
        `uses undefined ${call.token} without fallback; map it to an existing design token or add an explicit fallback.`
    }));
}


function collectExtremeZIndexUsages({
  file,
  text
}) {

  const issues =
    [];

  const pattern =
    /\bz-index\s*:\s*([^;{}]+);?/gi;

  let match;

  while ((match = pattern.exec(text)) !== null) {

    const value =
      match[1]
        .trim();

    const numeric =
      value.match(
        /^[+-]?\d+(?:\.\d+)?$/
      );

    if (!numeric) {

      continue;
    }

    const zIndex =
      Number(
        value
      );

    if (
      Math.abs(
        zIndex
      ) < EXTREME_Z_INDEX_THRESHOLD
    ) {

      continue;
    }

    issues.push({
      type:
        'hard-coded-extreme-z-index',
      file,
      line:
        getLineNumber(
          text,
          match.index
        ),
      value:
        zIndex,
      message:
        `uses hard-coded extreme z-index ${zIndex}; focused overlays should use ${[...OVERLAY_LAYER_TOKENS].join(', ')}.`
    });
  }

  return issues;
}


function collectVarCalls(
  text
) {

  const calls =
    [];

  let index =
    0;

  while (index < text.length) {

    const start =
      text.indexOf(
        'var(',
        index
      );

    if (start === -1) break;

    const bodyStart =
      start + 4;

    const bodyEnd =
      findMatchingParen(
        text,
        bodyStart
      );

    if (bodyEnd === -1) {

      index =
        bodyStart;

      continue;
    }

    const body =
      text.slice(
        bodyStart,
        bodyEnd
      );

    const commaIndex =
      findTopLevelComma(
        body
      );

    const token =
      body
        .slice(
          0,
          commaIndex === -1
            ? body.length
            : commaIndex
        )
        .trim();

    calls.push({
      index:
        start,
      token,
      hasFallback:
        commaIndex !== -1 &&
        body
          .slice(
            commaIndex + 1
          )
          .trim()
          .length > 0
    });

    index =
      bodyStart;
  }

  return calls;
}


function findMatchingParen(
  text,
  bodyStart
) {

  let depth =
    1;

  for (let index = bodyStart; index < text.length; index += 1) {

    const char =
      text[index];

    if (char === '(') {

      depth += 1;
    } else if (char === ')') {

      depth -= 1;

      if (depth === 0) {

        return index;
      }
    }
  }

  return -1;
}


function findTopLevelComma(
  value
) {

  let depth =
    0;

  for (let index = 0; index < value.length; index += 1) {

    const char =
      value[index];

    if (char === '(') {

      depth += 1;
    } else if (char === ')') {

      depth -= 1;
    } else if (
      char === ',' &&
      depth === 0
    ) {

      return index;
    }
  }

  return -1;
}


function readCssText({
  root,
  file,
  fileContents
}) {

  const normalizedFile =
    normalizePath(
      file
    );

  if (
    fileContents &&
    Object.prototype.hasOwnProperty.call(
      fileContents,
      normalizedFile
    )
  ) {

    return fileContents[normalizedFile];
  }

  return readFileSync(
    join(
      root,
      normalizedFile
    ),
    'utf8'
  );
}


function stripCommentsPreserveLines(
  text
) {

  return String(text || '')
    .replace(
      /\/\*[\s\S]*?\*\//g,
      comment =>
        comment.replace(
          /[^\r\n]/g,
          ' '
        )
    );
}


function getLineNumber(
  text,
  index
) {

  return text
    .slice(
      0,
      index
    )
    .split(/\r?\n/).length;
}


function normalizePath(
  value
) {

  return String(value || '')
    .replaceAll(
      '\\',
      '/'
    );
}


function isMainModule() {

  return fileURLToPath(
    import.meta.url
  ) === process.argv[1];
}
