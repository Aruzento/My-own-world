// Existing pure policy, shared by historical compatibility and Entity projections.
export function calculateDndArmorClass({ dexModifier = 0, armorKind = 'none', armorBaseAc = '', armorDexMax = '' } = {}) {
  const dex = normalizeNumber(dexModifier, 0);
  const optional = value => value === '' || value === null || value === undefined ? null : Number.isFinite(Number(value)) ? Math.floor(Number(value)) : null;
  const base = optional(armorBaseAc);
  if (armorKind === 'light') return (base ?? 11) + dex;
  if (armorKind === 'medium') return (base ?? 12) + Math.min(dex, optional(armorDexMax) ?? 2);
  if (armorKind === 'heavy') return base ?? 16;
  if (armorKind === 'shield') return 10 + dex + (base ?? 2);
  return 10 + dex;
}

export function calculateDndAbilityModifier(
  score
) {

  const value =
    clamp(
      normalizeNumber(
        score,
        10
      ),
      1,
      30
    );

  return Math.floor(
    (value - 10) / 2
  );
}


export function calculateDndProficiencyBonus(
  level
) {

  const value =
    clamp(
      normalizeNumber(
        level,
        1
      ),
      1,
      20
    );

  return 2 + Math.floor(
    (value - 1) / 4
  );
}


export function calculateDndCheckValue(
  {
    abilityModifier = 0,
    proficient = false,
    proficiencyLevel = null,
    proficiencyBonus = 2
  } = {}
) {

  const level =
    proficiencyLevel === null ||
    proficiencyLevel === undefined
      ? (
        proficient
          ? 1
          : 0
      )
      : clampNumber(
        Number(proficiencyLevel) || 0,
        0,
        2
      );

  return normalizeNumber(
    abilityModifier,
    0
  ) + (
    level > 0
      ? normalizeNumber(
        proficiencyBonus,
        2
      ) * level
      : 0
  );
}



function normalizeNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.floor(number) : fallback; }
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clampNumber = clamp;
