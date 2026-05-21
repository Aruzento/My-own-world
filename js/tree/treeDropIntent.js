// Чистые правила выбора drop-намерения для дерева.
// Их можно тестировать без DOM и потом использовать в pointer-controller.

export function getTreeDropIntentFromRatio(
  ratio
) {

  const safeRatio =
    Number.isFinite(Number(ratio))
      ? Number(ratio)
      : 0.5;

  if (safeRatio < 0.24) {

    return 'before';
  }

  if (safeRatio > 0.76) {

    return 'after';
  }

  return 'inside';
}


export function getTreeDropLevel(
  targetLevel,
  mode
) {

  const level =
    Math.max(
      0,
      Number(targetLevel) || 0
    );

  if (mode === 'inside') {

    return level + 1;
  }

  return level;
}
