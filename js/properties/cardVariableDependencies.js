import {
  getCardVariableValue,
  readCardVariablesFromPage
} from './cardVariablesModel.js';


// Этот модуль - foundation для зависимостей между карточками.
// Он не исполняет произвольный JS: поддерживается только безопасная
// сумма чисел и путей вида self.str, race.str или class.level.

export function createCardVariableDependencyContext(
  {
    page = null,
    pages = []
  } = {}
) {

  const selfVariables =
    readVariablesForPage(
      page
    );

  const pageIndex =
    createLookupIndex(
      pages
    );

  return {
    kind: 'CardVariableDependencyContext',
    version: 1,
    page,
    pages,
    self:
      selfVariables,
    references:
      createReferenceIndex({
        variablesModel:
          selfVariables,
        pageIndex
      }),
    pageIndex
  };
}


export function resolveCardVariablePath(
  context,
  path,
  fallback = null
) {

  const normalized =
    String(path || '').trim();

  if (!normalized) {

    return createResolvedVariable({
      path:
        normalized,
      value:
        fallback,
      found:
        false
    });
  }

  const parts =
    normalized.split('.');

  if (
    parts.length === 1 ||
    parts[0] === 'self'
  ) {

    const key =
      parts.length === 1
        ? parts[0]
        : parts.slice(1).join('.');

    const value =
      getCardVariableValue(
        context?.self,
        key,
        fallback
      );

    return createResolvedVariable({
      path:
        normalized,
      value,
      source:
        'self',
      sourcePageId:
        context?.page?.id || '',
      sourceKey:
        key,
      found:
        value !== fallback
    });
  }

  const referenceKey =
    parts[0];

  const variableKey =
    parts.slice(1).join('.');

  const reference =
    context?.references?.[referenceKey] ||
    context?.pageIndex?.[referenceKey];

  if (!reference) {

    return createResolvedVariable({
      path:
        normalized,
      value:
        fallback,
      source:
        referenceKey,
      sourceKey:
        variableKey,
      found:
        false
    });
  }

  const value =
    getCardVariableValue(
      reference.variables,
      variableKey,
      fallback
    );

  return createResolvedVariable({
    path:
      normalized,
    value,
    source:
      referenceKey,
    sourcePageId:
      reference.page?.id || '',
    sourceKey:
      variableKey,
    found:
      value !== fallback
  });
}


export function calculateCardVariableFormula(
  {
    key = '',
    label = '',
    formula = '',
    context = null
  } = {}
) {

  const terms =
    parseAdditiveFormula(
      formula
    );

  const parts =
    terms.map(term =>
      resolveFormulaTerm(
        context,
        term
      )
    );

  const diagnostics =
    parts
      .filter(part => !part.found)
      .map(part => ({
        path:
          part.path,
        message:
          `Не найдена переменная: ${part.path}`
      }));

  const value =
    parts.reduce(
      (sum, part) =>
        sum + part.sign * normalizeNumber(
          part.value,
          0
        ),
      0
    );

  return {
    kind: 'CardVariableCalculation',
    version: 1,
    key,
    label:
      label || key,
    formula,
    value,
    source:
      diagnostics.length
        ? 'partial'
        : 'calculated',
    parts,
    diagnostics
  };
}


function createReferenceIndex(
  {
    variablesModel,
    pageIndex
  }
) {

  const references = {};

  Object.values(
    variablesModel?.byKey || {}
  ).forEach(variable => {

    if (
      typeof variable.value !== 'string' ||
      !variable.value.trim()
    ) {

      return;
    }

    const reference =
      pageIndex[variable.value.trim()];

    if (!reference) return;

    references[variable.key] =
      reference;
  });

  return references;
}


function createLookupIndex(
  pages
) {

  const index = {};

  (pages || []).forEach(page => {

    addPageLookup(
      index,
      page?.id,
      page
    );

    addPageLookup(
      index,
      page?.title,
      page
    );

    (page?.aliases || []).forEach(alias =>
      addPageLookup(
        index,
        alias,
        page
      )
    );
  });

  return index;
}


function addPageLookup(
  index,
  key,
  page
) {

  const normalized =
    String(key || '').trim();

  if (!normalized || !page) return;

  index[normalized] = {
    page,
    variables:
      readVariablesForPage(
        page
      )
  };
}


function readVariablesForPage(
  page
) {

  return page?.variablesModel ||
    readCardVariablesFromPage(
      page
    );
}


function parseAdditiveFormula(
  formula
) {

  return String(formula || '')
    .replaceAll('-', '+-')
    .split('+')
    .map(term =>
      term.trim()
    )
    .filter(Boolean)
    .map(term => ({
      sign:
        term.startsWith('-')
          ? -1
          : 1,
      value:
        term.replace(/^-/, '').trim()
    }));
}


function resolveFormulaTerm(
  context,
  term
) {

  const numeric =
    Number(term.value);

  if (Number.isFinite(numeric)) {

    return {
      path:
        term.value,
      value:
        numeric,
      sign:
        term.sign,
      source:
        'literal',
      sourcePageId:
        '',
      sourceKey:
        '',
      found:
        true
    };
  }

  return {
    ...resolveCardVariablePath(
      context,
      term.value,
      null
    ),
    sign:
      term.sign
  };
}


function createResolvedVariable(
  {
    path,
    value,
    source = '',
    sourcePageId = '',
    sourceKey = '',
    found = false
  }
) {

  return {
    path,
    value,
    source,
    sourcePageId,
    sourceKey,
    found
  };
}


function normalizeNumber(
  value,
  fallback
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}
