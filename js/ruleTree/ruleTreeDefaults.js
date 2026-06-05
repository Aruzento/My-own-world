// Данные по умолчанию для отдельной сущности Rule Tree.
// В persistent HTML хранится только этот JSON, а вся панель управления строится runtime-рендером.

export function createDefaultRuleTreeData() {

  return {
    version: 1,
    groups: [
      {
        id: 'core',
        title: 'Основные правила',
        parentId: null
      },
      {
        id: 'legacy',
        title: 'Импортированные правила',
        parentId: null
      },
      {
        id: 'homebrew',
        title: 'Homebrew',
        parentId: null
      }
    ],
    activeRuleIds: [],
    rules: []
  };
}
