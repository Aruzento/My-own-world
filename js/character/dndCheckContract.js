// Canonical D&D vocabulary shared by legacy schemas and Entity gameplay.
export const DND_ABILITIES = Object.freeze({ str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' });
export const DND_CHECK_GROUPS = [
  skillGroupField(
    'strSkills',
    'Навыки СИЛ',
    'str',
    [
      skillCheck('saveStr', 'Спасбросок СИЛ'),
      skillCheck('skillAthletics', 'Атлетика')
    ]
  ),
  skillGroupField(
    'dexSkills',
    'Навыки ЛОВ',
    'dex',
    [
      skillCheck('saveDex', 'Спасбросок ЛОВ'),
      skillCheck('skillAcrobatics', 'Акробатика'),
      skillCheck('skillSleightOfHand', 'Ловкость рук'),
      skillCheck('skillStealth', 'Скрытность')
    ]
  ),
  skillGroupField(
    'conSkills',
    'Навыки ТЛС',
    'con',
    [
      skillCheck('saveCon', 'Спасбросок ТЛС')
    ]
  ),
  skillGroupField(
    'intSkills',
    'Навыки ИНТ',
    'int',
    [
      skillCheck('saveInt', 'Спасбросок ИНТ'),
      skillCheck('skillInvestigation', 'Анализ'),
      skillCheck('skillHistory', 'История'),
      skillCheck('skillArcana', 'Магия'),
      skillCheck('skillNature', 'Природа'),
      skillCheck('skillReligion', 'Религия')
    ]
  ),
  skillGroupField(
    'wisSkills',
    'Навыки МДР',
    'wis',
    [
      skillCheck('saveWis', 'Спасбросок МДР'),
      skillCheck('skillPerception', 'Внимательность'),
      skillCheck('skillSurvival', 'Выживание'),
      skillCheck('skillMedicine', 'Медицина'),
      skillCheck('skillInsight', 'Проницательность'),
      skillCheck('skillAnimalHandling', 'Уход за животными')
    ]
  ),
  skillGroupField(
    'chaSkills',
    'Навыки ХАР',
    'cha',
    [
      skillCheck('saveCha', 'Спасбросок ХАР'),
      skillCheck('skillPerformance', 'Выступление'),
      skillCheck('skillIntimidation', 'Запугивание'),
      skillCheck('skillDeception', 'Обман'),
      skillCheck('skillPersuasion', 'Убеждение')
    ]
  )
];

function skillGroupField(
  name,
  label,
  ability,
  items
) {

  return {
    name,
    label,
    ability,
    type: 'skillGroup',
    items
  };
}


function skillCheck(
  name,
  label
) {

  return {
    name,
    label,
    proficientName:
      `${name}Proficient`
  };
}



export const DND_CHECKS = Object.freeze(DND_CHECK_GROUPS.flatMap(group => group.items.map(item => Object.freeze({ key: item.name, label: item.label, ability: group.ability, abilityId: DND_ABILITIES[group.ability], isSave: item.name.startsWith('save'), id: item.name.startsWith('skill') ? item.name[5].toLowerCase() + item.name.slice(6) : DND_ABILITIES[group.ability] }))));
export const DND_STANDARD_SKILLS = Object.freeze(DND_CHECKS.filter(item => !item.isSave));
