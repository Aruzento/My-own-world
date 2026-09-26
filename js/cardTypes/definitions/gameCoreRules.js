import { ABILITY_WITH_AUTO_OPTIONS, DAMAGE_TYPE_OPTIONS, CONDITION_OPTIONS, RESTORE_OPTIONS } from './gameCoreShared.js';
import { enumArrayField, formulaField, nestedField, objectField, options, referenceArrayField, referenceField, repeatableField, section, source, stringArrayField, variableField } from './gameCoreHelpers.js';

const p = (type, ...parts) => source(type, ...parts);
const o = options;
const distance = (key, label, type, sectionId = 'targeting') => objectField(key, label, [
  nestedField(`${key}.type`, 'Тип', 'enum', { options: o([['self','На себя'],['touch','Касание'],['distance','Дистанция'],['sight','В пределах зрения'],['unlimited','Неограниченно'],['special','Особое']]) }, p(type,label,'Тип')),
  nestedField(`${key}.value`, 'Значение', 'number', {}, p(type,label,'Значение')),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.maximum`, 'Дальняя граница', 'number', {}, p(type,label,'Дальняя граница'))]),
  nestedField(`${key}.units`, 'Единицы', 'enum', { options: o(['feet','meters','squares','miles','kilometers','touch','self','special']) }, p(type,label,'Единицы'))
], { section: sectionId }, p(type,label));
const targets = (key, type) => objectField(key, 'Цели', [
  nestedField(`${key}.type`, type === 'Заклинание' ? 'Тип' : 'Тип цели', 'enum', { options:o(['self','creature','character','player','object','point','space','area','multiple','special']) }, p(type,'Цели',type === 'Заклинание' ? 'Тип' : 'Тип цели')),
  nestedField(`${key}.count`, 'Количество', 'integer', { min:0 }, p(type,'Цели','Количество')),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.selection`, 'Выбор целей', 'enum', { options:o(['manual','automatic','all','random','rule']) }, p(type,'Цели','Выбор целей'))]),
  nestedField(`${key}.attitude`, 'Союзник/враг/любой', 'enum', { options:o(['ally','enemy','any','self']) }, p(type,'Цели','Союзник/враг/любой')),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.visibility`, 'Видимость цели', 'enum', { options:o(['line-of-sight','not-required','special']) }, p(type,'Цели','Видимость цели'))])
], { section:'targeting' }, p(type,'Цели'));
const area = (key,type) => objectField(key,'Область',[
  nestedField(`${key}.shape`,'Форма','enum',{options:o(['circle','sphere','cone','cube','cylinder','line','wall','special'])},p(type,'Область','Форма')),
  ...['Размер','Радиус','Длина','Ширина','Высота'].map((label,index)=>nestedField(`${key}.${['size','radius','length','width','height'][index]}`,label,'number',{},p(type,'Область',label))),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.units`,'Единицы','enum',{options:o(['feet','meters','squares','miles','kilometers','touch','self','special'])},p(type,'Область','Единицы'))])
],{section:'targeting'},p(type,'Область'));
const attack = (key,type) => objectField(key,'Атака',[
  ...(type === 'Заклинание' ? [nestedField(`${key}.enabled`,'Есть атака','boolean',{},p(type,'Атака','Есть атака'))] : []),
  nestedField(`${key}.rangeMode`,'Ближняя/дальняя','enum',{options:o(['melee','ranged'])},p(type,'Атака','Ближняя/дальняя')),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.kind`,'Оружейная/магическая','enum',{options:o(['weapon','magic','special'])},p(type,'Атака','Оружейная/магическая'))]),
  nestedField(`${key}.ability`,'Характеристика','enum',{options:ABILITY_WITH_AUTO_OPTIONS},p(type,'Атака','Характеристика')),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.proficiency`,'Использовать мастерство','boolean',{},p(type,'Атака','Использовать мастерство'))]),
  nestedField(`${key}.bonus`,type === 'Заклинание' ? 'Бонус' : 'Бонус попадания','number',{},p(type,'Атака',type === 'Заклинание' ? 'Бонус' : 'Бонус попадания')),
  formulaField(`${key}.formula`,type === 'Заклинание' ? 'Формула' : 'Формула попадания',{},p(type,'Атака',type === 'Заклинание' ? 'Формула' : 'Формула попадания'),true),
  nestedField(`${key}.criticalThreshold`,'Критический порог','integer',{},p(type,'Атака','Критический порог'))
],{section:'resolution'},p(type,'Атака'));
const save = (key,type) => objectField(key,'Спасбросок',[
  ...(type === 'Заклинание' ? [nestedField(`${key}.enabled`,'Есть спасбросок','boolean',{},p(type,'Спасбросок','Есть спасбросок'))] : []),
  enumArrayField(`${key}.abilities`,'Характеристика',ABILITY_WITH_AUTO_OPTIONS.filter(x=>!['auto','none'].includes(x.value)),{},p(type,'Спасбросок','Характеристика'),true),
  nestedField(`${key}.dc`,'Сл','integer',{},p(type,'Спасбросок','Сл')),
  formulaField(`${key}.dcFormula`,'Формула Сл',{},p(type,'Спасбросок','Формула Сл'),true),
  nestedField(`${key}.success`,'Эффект при успехе','string',{format:'multiline'},p(type,'Спасбросок','Эффект при успехе')),
  nestedField(`${key}.failure`,'Эффект при провале','string',{format:'multiline'},p(type,'Спасбросок','Эффект при провале'))
],{section:'resolution'},p(type,'Спасбросок'));
const damage = (key,type) => repeatableField(key,'Урон',[
  formulaField(`${key}.formula`,'Формула',{},p(type,'Урон','Формула'),true),
  nestedField(`${key}.type`,'Тип','enum',{options:DAMAGE_TYPE_OPTIONS},p(type,'Урон','Тип')),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.scaling`,'Масштабирование','string',{format:'multiline'},p(type,'Урон','Масштабирование'))]),
  formulaField(`${key}.critical`,'Критический урон',{},p(type,'Урон','Критический урон'),true)
],{section:'outcome'},p(type,'Урон'));
const healing = (key,type) => repeatableField(key,'Лечение',[
  formulaField(`${key}.formula`,'Формула',{},p(type,'Лечение','Формула'),true),
  ...(type === 'Заклинание' ? [] : [nestedField(`${key}.type`,'Тип','enum',{options:o(['healing','temporary-hp','restore-maximum','special'])},p(type,'Лечение','Тип'))]),
  nestedField(`${key}.temporaryHp`,'Временные хиты','number',{},p(type,'Лечение','Временные хиты'))
],{section:'outcome'},p(type,'Лечение'));
const duration = (key,type) => objectField(key,'Длительность',[
  nestedField(`${key}.value`,'Значение','number',{},p(type,'Длительность','Значение')),
  nestedField(`${key}.units`,'Единицы','enum',{options:o(['rounds','turns','minutes','hours','days','special'])},p(type,'Длительность','Единицы')),
  ...(type === 'Заклинание' ? [nestedField(`${key}.special`,'Особая','string',{format:'multiline'},p(type,'Длительность','Особая'))] : [])
],{section:'timing'},p(type,'Длительность'));

const skillFields = [
  variableField('skill.category','Категория','enum',{options:o(['attack','check','saving-throw','damage','healing','utility','passive','summon','teleport','transform','interaction','other']),section:'identity'},p('Навык','Категория')),
  variableField('skill.subcategory','Подкатегория','enum',{options:o([['custom','Пользовательское значение']]),section:'identity'},p('Навык','Подкатегория')),
  variableField('skill.level','Уровень','integer',{section:'identity'},p('Навык','Уровень')),
  variableField('skill.activationType','Тип активации','enum',{options:o(['action','bonus-action','reaction','free-action','passive','special']),section:'activation'},p('Навык','Тип активации')),
  variableField('skill.activationCost','Стоимость активации','number',{section:'activation'},p('Навык','Стоимость активации')),
  variableField('skill.trigger','Триггер','string',{format:'multiline',section:'activation'},p('Навык','Триггер')),
  stringArrayField('skill.requirements','Требования',{section:'activation'},p('Навык','Требования')),
  stringArrayField('skill.useConditions','Условия использования',{section:'activation'},p('Навык','Условия использования')),
  objectField('skill.uses','Использования',[nestedField('skill.uses.current','Текущие','integer',{},p('Навык','Использования','Текущие')),nestedField('skill.uses.maximum','Максимальные','integer',{},p('Навык','Использования','Максимальные')),formulaField('skill.uses.formula','Формула',{},p('Навык','Использования','Формула'),true)],{section:'activation'},p('Навык','Использования')),
  variableField('skill.recovery','Восстановление','enum',{options:RESTORE_OPTIONS,section:'activation'},p('Навык','Восстановление')),
  formulaField('skill.recoveryFormula','Формула восстановления',{section:'activation'},p('Навык','Восстановление','Формула')),
  repeatableField('skill.resourceCosts','Стоимость ресурсов',[referenceField('skill.resourceCosts.resource','Ресурс',['player','character','class'],{},p('Навык','Стоимость ресурсов','Ресурс'),true),nestedField('skill.resourceCosts.amount','Количество','integer',{},p('Навык','Стоимость ресурсов','Количество')),formulaField('skill.resourceCosts.formula','Формула',{},p('Навык','Стоимость ресурсов','Формула'),true)],{section:'activation'},p('Навык','Стоимость ресурсов')),
  distance('skill.range','Дальность','Навык'), targets('skill.targets','Навык'), area('skill.area','Навык'), attack('skill.attack','Навык'),
  objectField('skill.check','Проверка',[enumArrayField('skill.check.abilities','Характеристика',ABILITY_WITH_AUTO_OPTIONS.filter(x=>!['auto','none'].includes(x.value)),{},p('Навык','Проверка','Характеристика'),true),referenceArrayField('skill.check.skills','Навык',['skill'],{},p('Навык','Проверка','Навык'),true),nestedField('skill.check.dc','Сл','integer',{},p('Навык','Проверка','Сл')),formulaField('skill.check.dcFormula','Формула Сл',{},p('Навык','Проверка','Формула Сл'),true)],{section:'resolution'},p('Навык','Проверка')),
  save('skill.save','Навык'),damage('skill.damage','Навык'),healing('skill.healing','Навык'),
  referenceArrayField('skill.effects','Эффекты',['effect'],{section:'outcome'},p('Навык','Эффекты')),
  referenceArrayField('skill.conditions','Состояния',['effect'],{section:'outcome'},p('Навык','Состояния')),
  duration('skill.duration','Навык'),
  variableField('skill.concentration','Концентрация','boolean',{section:'timing'},p('Навык','Концентрация')),
  objectField('skill.scaling','Масштабирование',[formulaField('skill.scaling.formula','Формула',{},p('Навык','Масштабирование','Формула'),true)],{section:'outcome'},p('Навык','Масштабирование')),
  referenceField('skill.summon','Призываемая сущность',['character'],{section:'special'},p('Навык','Призываемая сущность')),
  objectField('skill.teleport','Телепортация',[nestedField('skill.teleport.distance','Расстояние','number',{},p('Навык','Телепортация','Расстояние')),objectField('skill.teleport.destination','Точка назначения',[referenceField('skill.teleport.destination.location','Локация',['location'],{},null,true),nestedField('skill.teleport.destination.coordinates','Координаты')],{},p('Навык','Телепортация','Точка назначения'),true)],{section:'special'},p('Навык','Телепортация')),
  objectField('skill.transform','Трансформация',[referenceField('skill.transform.target','Карточка',['character','race','class','item'],{},null,true),nestedField('skill.transform.text','Ручное описание','string',{format:'multiline'})],{section:'special'},p('Навык','Трансформация')),
  referenceField('skill.requiredItem','Требуемый предмет',['item'],{section:'relations'},p('Навык','Требуемый предмет')),
  referenceField('skill.requiredWeapon','Требуемое оружие',['item'],{section:'relations'},p('Навык','Требуемое оружие')),
  objectField('skill.grantedBy','Предоставляется',[
    ...[['race','Расой','race'],['class','Классом','class'],['item','Предметом','item'],['skill','Другим навыком','skill']].map(([k,l,t])=>referenceArrayField(`skill.grantedBy.${k}`,l,[t],{},p('Навык','Предоставляется',l),true))
  ],{section:'relations'},p('Навык','Предоставляется')),
  referenceArrayField('skill.relatedSkills','Связанные навыки',['skill'],{section:'relations'},p('Навык','Связанные навыки'))
];

const spellFields = [
  variableField('spell.level','Уровень','integer',{min:0,max:9,section:'identity'},p('Заклинание','Уровень')),
  variableField('spell.school','Школа','enum',{options:o(['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation','custom']),section:'identity'},p('Заклинание','Школа')),
  variableField('spell.ritual','Ритуал','boolean',{section:'identity'},p('Заклинание','Ритуал')),
  variableField('spell.concentration','Концентрация','boolean',{section:'identity'},p('Заклинание','Концентрация')),
  referenceArrayField('spell.classes','Классы',['class'],{section:'identity'},p('Заклинание','Классы')),
  referenceArrayField('spell.subclasses','Подклассы',['class'],{section:'identity'},p('Заклинание','Подклассы')),
  referenceField('spell.magicSource','Источник магии',['class','race','item','lore'],{section:'identity'},p('Заклинание','Источник магии')),
  objectField('spell.castingTime','Время накладывания',[nestedField('spell.castingTime.activationType','Тип активации','enum',{options:o(['action','bonus-action','reaction','free-action','passive','special'])},p('Заклинание','Время накладывания','Тип активации')),nestedField('spell.castingTime.count','Количество','integer',{},p('Заклинание','Время накладывания','Количество')),nestedField('spell.castingTime.units','Единицы','enum',{options:o(['action','bonus-action','reaction','round','minute','hour','day','special'])},p('Заклинание','Время накладывания','Единицы')),nestedField('spell.castingTime.reactionTrigger','Триггер реакции','string',{format:'multiline'},p('Заклинание','Время накладывания','Триггер реакции'))],{section:'casting'},p('Заклинание','Время накладывания')),
  distance('spell.range','Дальность','Заклинание','casting'),targets('spell.targets','Заклинание'),area('spell.area','Заклинание'),
  objectField('spell.components','Компоненты',[nestedField('spell.components.verbal','Вербальный','boolean',{},p('Заклинание','Компоненты','Вербальный')),nestedField('spell.components.somatic','Соматический','boolean',{},p('Заклинание','Компоненты','Соматический')),nestedField('spell.components.material','Материальный','boolean',{},p('Заклинание','Компоненты','Материальный')),nestedField('spell.components.materialText','Материал','string',{format:'multiline'},p('Заклинание','Компоненты','Материал')),nestedField('spell.components.cost','Стоимость материала','number',{},p('Заклинание','Компоненты','Стоимость материала')),nestedField('spell.components.consumed','Материал расходуется','boolean',{},p('Заклинание','Компоненты','Материал расходуется'))],{section:'casting'},p('Заклинание','Компоненты')),
  duration('spell.duration','Заклинание'),attack('spell.attack','Заклинание'),save('spell.save','Заклинание'),damage('spell.damage','Заклинание'),healing('spell.healing','Заклинание'),
  referenceArrayField('spell.effects','Эффекты',['effect'],{section:'outcome'},p('Заклинание','Эффекты')),
  referenceArrayField('spell.conditions','Состояния',['effect'],{section:'outcome'},p('Заклинание','Состояния')),
  objectField('spell.scaling','Масштабирование',[formulaField('spell.scaling.formula','Формула',{},p('Заклинание','Масштабирование','Формула'),true)],{section:'outcome'},p('Заклинание','Масштабирование')),
  referenceField('spell.summon','Призыв',['character','item'],{section:'special'},p('Заклинание','Призыв')),
  objectField('spell.teleport','Телепортация',[formulaField('spell.teleport.distance','Дальность',{},null,true),nestedField('spell.teleport.units','Единицы','enum',{options:o(['feet','meters','squares','miles','kilometers','special'])})],{section:'special'},p('Заклинание','Телепортация')),
  objectField('spell.transform','Трансформация',[referenceField('spell.transform.target','Карточка',['character','race','class','item'],{},null,true),nestedField('spell.transform.text','Ручное описание','string',{format:'multiline'})],{section:'special'},p('Заклинание','Трансформация')),
  referenceArrayField('spell.specialActions','Особые действия',['skill'],{section:'special'},p('Заклинание','Особые действия'))
];

const effectFields = [
  variableField('effect.category','Категория','enum',{options:o(['buff','debuff','condition','aura','environment','item','spell','disease','poison','curse','other']),section:'identity'},p('Эффект','Категория')),
  variableField('effect.status','Статус','enum',{options:o(['active','inactive','suppressed','expired']),section:'identity'},p('Эффект','Статус')),
  referenceField('effect.source','Источник',['player','character','item','skill','spell','effect','race','class'],{section:'identity'},p('Эффект','Источник')),
  referenceField('effect.caster','Наложивший',['player','character'],{section:'identity'},p('Эффект','Наложивший')),
  referenceArrayField('effect.targets','Цели',['player','character','item'],{section:'identity'},p('Эффект','Цели')),
  variableField('effect.icon','Иконка состояния','asset',{section:'identity'},p('Эффект','Иконка состояния')),
  variableField('effect.visibility','Видимость','enum',{options:o(['public','owner','gm','hidden']),section:'identity'},p('Эффект','Видимость')),
  objectField('effect.duration','Длительность',[nestedField('effect.duration.type','Тип','enum',{options:o(['instant','time','rounds-turns','until-rest','until-dawn','permanent','special'])},p('Эффект','Длительность','Тип')),nestedField('effect.duration.rounds','Раунды','number',{},p('Эффект','Длительность','Раунды')),nestedField('effect.duration.turns','Ходы','number',{},p('Эффект','Длительность','Ходы')),nestedField('effect.duration.seconds','Секунды','number',{},p('Эффект','Длительность','Секунды')),nestedField('effect.duration.minutes','Минуты','number',{},p('Эффект','Длительность','Минуты')),nestedField('effect.duration.hours','Часы','number',{},p('Эффект','Длительность','Часы'))],{section:'timing'},p('Эффект','Длительность')),
  objectField('effect.start','Старт',[nestedField('effect.start.round','Раунд','integer',{},p('Эффект','Старт','Раунд')),nestedField('effect.start.turn','Ход','integer',{},p('Эффект','Старт','Ход')),nestedField('effect.start.datetime','Время','datetime',{},p('Эффект','Старт','Время'))],{section:'timing'},p('Эффект','Старт')),
  variableField('effect.expiration','Истечение','enum',{options:o(['end-of-source-turn','start-of-source-turn','end-of-target-turn','start-of-target-turn','duration','rest','manual','special']),section:'timing'},p('Эффект','Истечение')),
  variableField('effect.concentration','Концентрация','boolean',{section:'timing'},p('Эффект','Концентрация')),
  objectField('effect.stacks','Стеки',[nestedField('effect.stacks.allowed','Разрешены','boolean',{},p('Эффект','Стеки','Разрешены')),nestedField('effect.stacks.current','Текущие','integer',{},p('Эффект','Стеки','Текущие')),nestedField('effect.stacks.maximum','Максимальные','integer',{},p('Эффект','Стеки','Максимальные')),nestedField('effect.stacks.mode','Режим суммирования','enum',{options:o(['none','replace','sum','maximum','minimum','independent','refresh-duration'])},p('Эффект','Стеки','Режим суммирования'))],{section:'timing'},p('Эффект','Стеки')),
  repeatableField('effect.changes','Изменения',[nestedField('effect.changes.key','Поле','string',{},p('Эффект','Изменения','Поле')),nestedField('effect.changes.mode','Операция','enum',{options:o(['add','multiply','replace','minimum','maximum','override','custom'])},p('Эффект','Изменения','Операция')),nestedField('effect.changes.value','Значение','number',{},p('Эффект','Изменения','Значение')),formulaField('effect.changes.formula','Формула',{},p('Эффект','Изменения','Формула'),true),nestedField('effect.changes.priority','Приоритет','integer',{},p('Эффект','Изменения','Приоритет'))],{section:'modifiers'},p('Эффект','Изменения')),
  repeatableField('effect.abilities','Характеристики',[nestedField('effect.abilities.ability','Характеристика','enum',{options:ABILITY_WITH_AUTO_OPTIONS}),nestedField('effect.abilities.bonus','Бонус','number'),nestedField('effect.abilities.mode','Режим','enum',{options:o(['add','set','minimum','maximum'])})],{section:'modifiers'},p('Эффект','Характеристики')),
  ...[['rollBonuses','Бонусы бросков'],['rollPenalties','Штрафы бросков'],['advantage','Преимущества'],['disadvantage','Помехи']].map(([k,l])=>stringArrayField(`effect.${k}`,l,{section:'modifiers'},p('Эффект',l))),
  ...[['speed','Скорость'],['armorClass','Класс доспеха'],['hitPoints','Хиты'],['temporaryHitPoints','Временные хиты']].map(([k,l])=>repeatableField(`effect.${k}`,l,[nestedField(`effect.${k}.mode`,'Режим','enum',{options:o(['add','multiply','set','minimum','maximum'])}),nestedField(`effect.${k}.value`,'Значение','number'),formulaField(`effect.${k}.formula`,'Формула',{},null,true)],{section:'modifiers'},p('Эффект',l))),
  enumArrayField('effect.resistances','Сопротивления',DAMAGE_TYPE_OPTIONS,{section:'defense'},p('Эффект','Сопротивления')),
  enumArrayField('effect.immunities','Иммунитеты',DAMAGE_TYPE_OPTIONS,{section:'defense'},p('Эффект','Иммунитеты')),
  enumArrayField('effect.vulnerabilities','Уязвимости',DAMAGE_TYPE_OPTIONS,{section:'defense'},p('Эффект','Уязвимости')),
  enumArrayField('effect.conditionImmunities','Иммунитеты к состояниям',CONDITION_OPTIONS,{section:'defense'},p('Эффект','Иммунитеты к состояниям')),
  stringArrayField('effect.actionRestrictions','Ограничения действий',{section:'restrictions'},p('Эффект','Ограничения действий')),
  stringArrayField('effect.movementRestrictions','Ограничения движения',{section:'restrictions'},p('Эффект','Ограничения движения')),
  repeatableField('effect.periodicDamage','Урон по времени',[formulaField('effect.periodicDamage.formula','Формула',{},p('Эффект','Урон по времени','Формула'),true),nestedField('effect.periodicDamage.type','Тип','enum',{options:DAMAGE_TYPE_OPTIONS},p('Эффект','Урон по времени','Тип')),nestedField('effect.periodicDamage.trigger','Момент срабатывания','string',{format:'multiline'},p('Эффект','Урон по времени','Момент срабатывания'))],{section:'outcome'},p('Эффект','Урон по времени')),
  repeatableField('effect.periodicHealing','Лечение по времени',[formulaField('effect.periodicHealing.formula','Формула',{},p('Эффект','Лечение по времени','Формула'),true),nestedField('effect.periodicHealing.trigger','Момент срабатывания','string',{format:'multiline'},p('Эффект','Лечение по времени','Момент срабатывания'))],{section:'outcome'},p('Эффект','Лечение по времени')),
  objectField('effect.removalSave','Спасбросок для снятия',[nestedField('effect.removalSave.ability','Характеристика','enum',{options:ABILITY_WITH_AUTO_OPTIONS},p('Эффект','Спасбросок для снятия','Характеристика')),nestedField('effect.removalSave.dc','Сл','integer',{},p('Эффект','Спасбросок для снятия','Сл')),nestedField('effect.removalSave.moment','Момент','string',{format:'multiline'},p('Эффект','Спасбросок для снятия','Момент'))],{section:'removal'},p('Эффект','Спасбросок для снятия')),
  enumArrayField('effect.autoRemoval','Автоматическое снятие',o(['short-rest','long-rest','healing','dispel','source-end','manual','special']),{section:'removal'},p('Эффект','Автоматическое снятие')),
  referenceArrayField('effect.relatedEffects','Связанные эффекты',['effect'],{section:'relations'},p('Эффект','Связанные эффекты')),
  referenceArrayField('effect.incompatibleEffects','Несовместимые эффекты',['effect'],{section:'relations'},p('Эффект','Несовместимые эффекты')),
  referenceArrayField('effect.grantedSkills','Предоставляемые навыки',['skill'],{section:'relations'},p('Эффект','Предоставляемые навыки')),
  variableField('effect.removable','Удаляемый/рассеиваемый','boolean',{section:'removal'},p('Эффект','Удаляемый/рассеиваемый'))
];

const sections=[section('card','Карточка',0),section('identity','Основное',10),section('activation','Активация',20),section('casting','Наложение',20),section('targeting','Цели',30),section('resolution','Проверки',40),section('outcome','Результат',50),section('timing','Время',60),section('special','Особое',70),section('modifiers','Модификаторы',30),section('defense','Защиты',40),section('restrictions','Ограничения',50),section('removal','Снятие',70),section('relations','Связи',80),section('publication','Публикация',90)];
export const SKILL_DEFINITION={id:'skill',version:1,label:'Навык',includes:[{id:'core.card-metadata',version:1}],fields:skillFields,sections,capabilities:{gameplayRule:true,action:true},metadata:{stage:5,catalog:'game-core'}};
export const SPELL_DEFINITION={id:'spell',version:1,label:'Заклинание',includes:[{id:'core.card-metadata',version:1},{id:'dnd.rule-publication',version:1}],fields:spellFields,sections,capabilities:{gameplayRule:true,spell:true},metadata:{stage:5,catalog:'game-core'}};
export const EFFECT_DEFINITION={id:'effect',version:1,label:'Эффект',includes:[{id:'core.card-metadata',version:1}],fields:effectFields,sections,capabilities:{gameplayRule:true,effect:true},metadata:{stage:5,catalog:'game-core'}};
