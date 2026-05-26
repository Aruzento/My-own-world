export function markRuntime(
  element
) {

  if (!element) return element;

  element.dataset.runtime =
    'true';

  element.setAttribute(
    'contenteditable',
    'false'
  );

  return element;
}

export function getMatchingElements(
  root,
  selector
) {

  const elements =
    [...root.querySelectorAll(selector)];

  if (
    root.matches?.(selector)
  ) {

    elements.unshift(
      root
    );
  }

  return elements;
}

export function ensureRuntimeInput(
  container,
  selector,
  className,
  placeholder
) {

  const existingInput =
    container.querySelector(selector);

  if (existingInput) {

    markRuntime(
      existingInput
    );

    return;
  }

  const input =
    document.createElement('input');

  input.className =
    className;

  input.placeholder =
    placeholder;

  markRuntime(
    input
  );

  container.appendChild(
    input
  );
}

export function ensureRuntimeButton(
  container,
  selector,
  className,
  text
) {

  const existingButton =
    container.querySelector(selector);

  if (existingButton) {

    markRuntime(
      existingButton
    );

    return;
  }

  const button =
    document.createElement('button');

  button.className =
    className;

  button.type =
    'button';

  button.textContent =
    text;

  markRuntime(
    button
  );

  container.appendChild(
    button
  );
}
