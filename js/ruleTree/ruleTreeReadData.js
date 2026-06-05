import {
  normalizeRuleTreeData
} from './ruleTreeNormalize.js';


// Читает persistent JSON из DOM-элемента Rule Tree.

export function readRuleTreeData(
  tree
) {

  const script =
    tree?.querySelector?.('[data-rule-tree-data], .rule-tree-data');

  return readRuleTreeDataFromText(
    script?.textContent
  );
}


// Читает Rule Tree JSON из HTML-строки. Это нужно provider-слою, который часто работает без DOM.

export function readRuleTreeDataFromHTML(
  html
) {

  if (!html) {

    return normalizeRuleTreeData(null);
  }

  if (typeof document !== 'undefined') {

    const wrapper =
      document.createElement('div');

    wrapper.innerHTML =
      String(html || '');

    return readRuleTreeData(
      wrapper
    );
  }

  const match =
    String(html)
      .match(/<script\b[^>]*(?:data-rule-tree-data|class=["'][^"']*rule-tree-data[^"']*["'])[^>]*>([\s\S]*?)<\/script>/i);

  return readRuleTreeDataFromText(
    match?.[1]
  );
}


function readRuleTreeDataFromText(
  text
) {

  if (!String(text || '').trim()) {

    return normalizeRuleTreeData(null);
  }

  try {

    return normalizeRuleTreeData(
      JSON.parse(
        text
      )
    );

  } catch (error) {

    console.warn(
      'Rule Tree: не удалось прочитать JSON-модель.',
      error
    );

    return normalizeRuleTreeData(null);
  }
}
