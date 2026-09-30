// Existing pure policy, shared by Properties compatibility and Entity projections.
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
