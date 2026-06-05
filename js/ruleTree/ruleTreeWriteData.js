// Записывает модель Rule Tree обратно в persistent script-тег.

export function writeRuleTreeData(
  tree,
  data
) {

  let script =
    tree.querySelector('[data-rule-tree-data], .rule-tree-data');

  if (!script) {

    script =
      document.createElement('script');

    tree.appendChild(
      script
    );
  }

  script.type =
    'application/json';

  script.className =
    'rule-tree-data';

  script.setAttribute(
    'data-rule-tree-data',
    ''
  );

  script.textContent =
    JSON.stringify(
      data
    )
      .replaceAll(
        '</script',
        '<\\/script'
      );
}
