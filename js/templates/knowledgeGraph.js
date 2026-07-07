export function createKnowledgeGraphTemplate() {

  return {
    name: 'Граф связей',
    template: 'knowledgeGraph',
    type: 'knowledgeGraph',
    tags: [
      'knowledge-graph'
    ],
    iconSvg: `
      <svg viewBox="0 0 24 24">
        <circle cx="6" cy="7" r="2.5"></circle>
        <circle cx="18" cy="7" r="2.5"></circle>
        <circle cx="12" cy="17" r="2.5"></circle>
        <path d="M8.2 8.3l7.6 0"></path>
        <path d="M7.5 9.2l3.2 5.5"></path>
        <path d="M16.5 9.2l-3.2 5.5"></path>
      </svg>
    `,
    content: `
      <div
        class="knowledge-graph-document"
        data-knowledge-graph="v1"
        contenteditable="false"
      >
        <div class="knowledge-graph-topbar" contenteditable="false">
          <h1
            class="knowledge-graph-title singleline-field"
            contenteditable="true"
            data-placeholder="Название графа"
          >
            Граф связей
          </h1>
        </div>
      </div>
    `
  };
}
