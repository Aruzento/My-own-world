export const EDITABLE_RELATIONSHIP_TYPES = [
  {
    value: 'related',
    label: 'Связь'
  },
  {
    value: 'ally',
    label: 'Союзник'
  },
  {
    value: 'enemy',
    label: 'Враг'
  },
  {
    value: 'owner',
    label: 'Владеет'
  },
  {
    value: 'equipped',
    label: 'Экипировано'
  },
  {
    value: 'rule',
    label: 'Правило'
  },
  {
    value: 'ruleEffect',
    label: 'Эффект правила'
  }
];


export function getEditableRelationshipType(
  value
) {

  const normalizedValue =
    String(value || '').trim();

  return EDITABLE_RELATIONSHIP_TYPES.some(type =>
    type.value === normalizedValue
  )
    ? normalizedValue
    : 'related';
}


const RELATIONSHIP_LABELS = {
  treeParent: 'В дереве',
  wikiLink: 'Wiki-ссылка',
  manual: 'Ручные связи',
  manualRelation: 'Связь',
  related: 'Связь',
  ally: 'Союзник',
  enemy: 'Враг',
  owner: 'Владеет',
  equipped: 'Экипировано',
  rule: 'Правило',
  ruleeffect: 'Эффект правила'
};


export function getRelationshipLabel(
  type
) {

  return RELATIONSHIP_LABELS[type] || type;
}
