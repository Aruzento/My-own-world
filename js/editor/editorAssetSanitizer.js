export function sanitizeAssetImagesBeforeRender(
  html
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html;

  wrapper
    .querySelectorAll(
      'img[data-asset]'
    )
    .forEach(img => {

      img.removeAttribute(
        'src'
      );
    });

  return wrapper.innerHTML;
}
