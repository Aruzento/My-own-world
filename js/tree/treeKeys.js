export function getTreePageKey(
  page
) {

  return page?.path ||
    page?.name ||
    page?.id ||
    '';
}


export function getTreePageKeys(
  page
) {

  return [
    page?.id,
    page?.path,
    page?.name
  ]
    .filter(Boolean);
}
