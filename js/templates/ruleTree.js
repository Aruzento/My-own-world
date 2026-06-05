import {
  createDefaultRuleTreeData
} from '../ruleTree/ruleTreeDefaults.js';


// Шаблон создает отдельную сущность Rule Tree, а не карточку с тегом rule.

export function createRuleTreeTemplate() {

  return {
    name: 'Правила',
    template: 'ruleTree',
    type: 'ruleTree',
    tags: ['rule-tree'],
    iconSvg: `
      <svg viewBox="0 0 24 24">
        <path d="M12 3v18"></path>
        <path d="M7 6h10"></path>
        <path d="M6 10h12"></path>
        <path d="M8 14h8"></path>
        <path d="M9 18h6"></path>
      </svg>
    `,
    content: `
      <div
        class="rule-tree-document"
        data-rule-tree="v1"
        contenteditable="false"
      >
        <div class="rule-tree-topbar" contenteditable="false">
          <h1
            class="rule-tree-title singleline-field"
            contenteditable="true"
            data-placeholder="Название дерева правил"
          >
            Новое дерево правил
          </h1>
        </div>
        <script
          class="rule-tree-data"
          type="application/json"
          data-rule-tree-data
        >${JSON.stringify(createDefaultRuleTreeData())}</script>
      </div>
    `
  };
}
