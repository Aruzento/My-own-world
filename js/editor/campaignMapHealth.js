import {
  createDndStatsBlock
} from '../templates/blockTypes.js';


export function getPageDndHealth(
  page
) {

  if (!page?.content) return null;

  const body =
    parsePageBody(
      page
    );

  const block =
    body.querySelector(
      '.dnd-stats-block'
    );

  if (!block) return null;

  const current =
    readNumberFromInput(
      block.querySelector('.dnd-current-hp')
    );

  const max =
    readNumberFromInput(
      block.querySelector('.dnd-max-hp')
    );

  if (
    current === null ||
    max === null ||
    max <= 0
  ) return null;

  return {
    current,
    max
  };
}


export function ensurePageDndHealth(
  page
) {

  if (!page?.content) return null;

  const existing =
    getPageDndHealth(
      page
    );

  if (existing) return existing;

  const wrapper =
    parsePageBody(
      page
    );

  const blockWrapper =
    document.createElement('div');

  blockWrapper.innerHTML =
    createDndStatsBlock({
      title: 'Стат. блок DnD'
    });

  const block =
    blockWrapper.querySelector(
      '.dnd-stats-block'
    );

  if (!block) return null;

  const currentInput =
    block.querySelector('.dnd-current-hp');

  const maxInput =
    block.querySelector('.dnd-max-hp');

  currentInput?.setAttribute(
    'value',
    '10'
  );

  maxInput?.setAttribute(
    'value',
    '10'
  );

  const target =
    wrapper.querySelector('.entity-main') ||
    wrapper;

  target.appendChild(
    block
  );

  page.content =
    replaceMarkdownBody(
      page.content,
      wrapper.innerHTML
    );

  return {
    current: 10,
    max: 10
  };
}


export function updatePageDndCurrentHp(
  page,
  delta
) {

  const wrapper =
    parsePageBody(
      page
    );

  let block =
    wrapper.querySelector(
      '.dnd-stats-block'
    );

  if (!block) {

    ensurePageDndHealth(
      page
    );

    return updatePageDndCurrentHp(
      page,
      delta
    );
  }

  if (!block) return null;

  const currentInput =
    block.querySelector('.dnd-current-hp');

  const maxInput =
    block.querySelector('.dnd-max-hp');

  const current =
    readNumberFromInput(
      currentInput
    );

  const max =
    readNumberFromInput(
      maxInput
    );

  if (
    !currentInput ||
    current === null ||
    max === null ||
    max <= 0
  ) return null;

  const next =
    clamp(
      current + delta,
      0,
      max
    );

  currentInput.setAttribute(
    'value',
    String(next)
  );

  currentInput.value =
    String(next);

  page.content =
    replaceMarkdownBody(
      page.content,
      wrapper.innerHTML
    );

  return {
    current: next,
    max
  };
}


export function getHealthColor(
  percent
) {

  const hue =
    Math.round(
      clamp(percent, 0, 1) * 120
    );

  return `hsl(${hue} 76% 48%)`;
}


function readNumberFromInput(
  input
) {

  if (!input) return null;

  const raw =
    input.getAttribute('value') ||
    input.value ||
    '';

  const match =
    String(raw)
      .replace(',', '.')
      .match(/-?\d+(\.\d+)?/);

  if (!match) return null;

  const value =
    Number(match[0]);

  return Number.isFinite(value)
    ? value
    : null;
}


function parsePageBody(
  page
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    String(page.content || '')
      .replace(/^---[\s\S]*?---/, '')
      .trim();

  return wrapper;
}


function replaceMarkdownBody(
  content,
  body
) {

  const frontMatter =
    String(content || '')
      .match(/^---[\s\S]*?---/);

  if (!frontMatter) return body;

  return `${frontMatter[0]}\n\n${body}\n`;
}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}
