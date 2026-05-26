export function setupEditorExternalLinkOpening(
  editor
) {

  editor.addEventListener(
    'click',
    event => {

      const link =
        event.target.closest('a');

      if (!link) return;

      if (
        link.classList.contains('wiki-link')
      ) return;

      event.preventDefault();

      window.open(
        link.href,
        '_blank'
      );
    }
  );
}
