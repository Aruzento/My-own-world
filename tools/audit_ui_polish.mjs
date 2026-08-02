import {
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';

import {
  join,
  relative
} from 'node:path';


const root =
  process.cwd();

const stylesRoot =
  join(
    root,
    'styles'
  );

const bannedBackdropSelectors =
  [
    'campaign-map-stage',
    'campaign-map-canvas',
    'campaign-map-workbench',
    'knowledge-graph-canvas',
    'knowledge-graph-workbench',
    'task-columns',
    'task-board',
    'tree-list',
    'virtual-tree',
    'editor-scroll'
  ];

const outlineNoneAllowlist =
  new Map([
    [
      'styles/editor.css::#editorArea',
      'The editor area is a structural host; focused text controls inside it carry their own focus-visible treatment.'
    ],
    [
      'styles/blocks.css::.is-editing-title',
      'The inline title editor is a transient contenteditable state and is covered by the global contenteditable focus-visible rule.'
    ]
  ]);

const report =
  {
    files:
      0,
    transitionDeclarations:
      0,
    animationDeclarations:
      0,
    keyframes:
      0,
    backdropFilters:
      0,
    outlineNone:
      0,
    outlineNoneCovered:
      0,
    reducedMotionFiles:
      0,
    errors:
      []
  };

for (const file of getFiles(stylesRoot, '.css')) {

  const relativePath =
    toPosix(
      relative(
        root,
        file
      )
    );

  const text =
    readFileSync(
      file,
      'utf8'
    );

  const css =
    stripComments(
      text
    );

  report.files += 1;
  report.transitionDeclarations += countMatches(
    css,
    /\btransition(?:-property)?\s*:/gi
  );
  report.animationDeclarations += countMatches(
    css,
    /\banimation\s*:/gi
  );
  report.keyframes += countMatches(
    css,
    /@keyframes\b/gi
  );
  report.backdropFilters += countMatches(
    css,
    /(?:^|\s)-?webkit-backdrop-filter\s*:|\bbackdrop-filter\s*:/gi
  );

  if (/prefers-reduced-motion/gi.test(css)) {

    report.reducedMotionFiles += 1;
  }

  checkTransitionAll({
    relativePath,
    text:
      css
  });

  checkWillChangeAll({
    relativePath,
    text:
      css
  });

  checkBackdropScope({
    relativePath,
    text:
      css
  });

  checkOutlineNone({
    relativePath,
    text:
      css
  });
}

if (report.errors.length > 0) {

  console.error(
    'UI polish audit failed:'
  );

  for (const error of report.errors) {

    console.error(
      `- ${error}`
    );
  }

  process.exit(
    1
  );
}

console.log(
  [
    `UI polish audit passed: ${report.files} CSS files`,
    `${report.transitionDeclarations} transition declarations`,
    `${report.animationDeclarations} animation declarations`,
    `${report.keyframes} keyframes`,
    `${report.backdropFilters} backdrop-filter declarations`,
    `${report.outlineNoneCovered}/${report.outlineNone} outline:none declarations covered`
  ].join(
    ', '
  )
);


function getFiles(
  directory,
  extension
) {

  return readdirSync(
    directory
  )
    .flatMap(entry => {

      const path =
        join(
          directory,
          entry
        );

      const stats =
        statSync(
          path
        );

      if (stats.isDirectory()) {

        return getFiles(
          path,
          extension
        );
      }

      return path.endsWith(extension)
        ? [path]
        : [];
    });
}


function checkTransitionAll({
  relativePath,
  text
}) {

  collectLineMatches(
    text,
    /\btransition(?:-property)?\s*:\s*all\b/gi
  )
    .forEach(line => {

      report.errors.push(
        `${relativePath}:${line} uses transition: all; list exact properties instead.`
      );
    });
}


function checkWillChangeAll({
  relativePath,
  text
}) {

  collectLineMatches(
    text,
    /\bwill-change\s*:\s*all\b/gi
  )
    .forEach(line => {

      report.errors.push(
        `${relativePath}:${line} uses will-change: all; restrict it to transform, opacity or filter.`
      );
    });
}


function checkBackdropScope({
  relativePath,
  text
}) {

  for (const rule of collectRules(text)) {

    const backdropValue =
      getBackdropFilterValue(
        rule.body
      );

    if (
      !backdropValue ||
      backdropValue === 'none'
    ) {

      continue;
    }

    const normalizedSelector =
      rule.selector.toLowerCase();

    const bannedSelector =
      bannedBackdropSelectors.find(selector =>
        normalizedSelector.includes(selector)
      );

    if (!bannedSelector) {

      continue;
    }

    report.errors.push(
      `${relativePath}:${rule.line} applies backdrop-filter to ${bannedSelector}; keep heavy blur out of large workbench surfaces.`
    );
  }
}


function getBackdropFilterValue(
  body
) {

  const match =
    body.match(
      /(?:^|\s)(?:-webkit-)?backdrop-filter\s*:\s*([^;]+);?/i
    );

  return match
    ? match[1].trim().toLowerCase()
    : '';
}


function checkOutlineNone({
  relativePath,
  text
}) {

  for (const rule of collectRules(text)) {

    if (!/\boutline\s*:\s*none\b/i.test(rule.body)) {

      continue;
    }

    for (const selector of splitSelectors(rule.selector)) {

      report.outlineNone += 1;

      const key =
        `${relativePath}::${selector}`;

      if (
        isCoveredFocusRule(rule) ||
        outlineNoneAllowlist.has(key) ||
        hasFocusCompanion({
          selector,
          text
        })
      ) {

        report.outlineNoneCovered += 1;
        continue;
      }

      report.errors.push(
        `${relativePath}:${rule.line} removes outline for "${selector}" without a focus/focus-visible companion.`
      );
    }
  }
}


function isCoveredFocusRule(
  rule
) {

  return (
    /:(?:focus-visible|focus)\b/i.test(rule.selector) &&
    /\b(?:box-shadow|border-color|outline)\s*:/i.test(rule.body)
  );
}


function hasFocusCompanion({
  selector,
  text
}) {

  const escapedSelector =
    escapeRegExp(
      selector
    );

  return new RegExp(
    `${escapedSelector}\\s*:(?:focus-visible|focus)\\b`,
    'i'
  )
    .test(
      text
    );
}


function stripComments(
  text
) {

  return text.replace(
    /\/\*[\s\S]*?\*\//g,
    ''
  );
}


function collectRules(
  text
) {

  const rules =
    [];

  const rulePattern =
    /([^{}]+)\{([^{}]*)\}/g;

  let match;

  while ((match = rulePattern.exec(text)) !== null) {

    const selector =
      match[1]
        .replace(/@media[^{]*$/i, '')
        .trim();

    if (
      !selector ||
      selector.startsWith('@')
    ) {

      continue;
    }

    rules.push({
      selector,
      body:
        match[2],
      line:
        getLineNumber(
          text,
          match.index
        )
    });
  }

  return rules;
}


function splitSelectors(
  selector
) {

  return selector
    .split(',')
    .map(part =>
      part.trim()
    )
    .filter(Boolean);
}


function collectLineMatches(
  text,
  pattern
) {

  const lines =
    [];

  let match;

  while ((match = pattern.exec(text)) !== null) {

    lines.push(
      getLineNumber(
        text,
        match.index
      )
    );
  }

  return lines;
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


function countMatches(
  text,
  pattern
) {

  return [
    ...text.matchAll(pattern)
  ].length;
}


function escapeRegExp(
  value
) {

  return String(value)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function toPosix(
  value
) {

  return value.replaceAll(
    '\\',
    '/'
  );
}
