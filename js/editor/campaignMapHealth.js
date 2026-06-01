import {
  createDndStatsBlock
} from '../templates/blockTypes.js';

import {
  getPageCharacterHealth,
  updatePageCharacterHealth
} from '../properties/characterCalculations.js';


export function getPageDndHealth(
  page
) {

  const modelHealth =
    getPageCharacterHealth(
      page
    );

  if (modelHealth) return modelHealth;

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
    max,
    temp: getBlockTempHp(
      block
    )
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
    max: 10,
    temp: 0
  };
}


export function updatePageDndHealth(
  page,
  {
    delta = 0,
    temp = null,
    mode = 'delta'
  } = {}
) {

  const modelResult =
    updatePageCharacterHealth(
      page,
      {
        delta,
        temp,
        mode
      }
    );

  if (modelResult) return modelResult;

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

    return updatePageDndHealth(
      page,
      {
        delta,
        temp,
        mode
      }
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

  let nextCurrent =
    current;

  let nextTemp =
    temp === null
      ? getBlockTempHp(
        block
      )
      : Math.max(
        0,
        Math.floor(
          Number(temp) || 0
        )
      );

  if (mode === 'restore') {

    nextCurrent =
      max;

  } else if (mode === 'kill') {

    nextCurrent =
      0;

  } else if (delta < 0) {

    const damage =
      Math.abs(
        delta
      );

    const absorbed =
      Math.min(
        nextTemp,
        damage
      );

    nextTemp -=
      absorbed;

    nextCurrent =
      clamp(
        current - (damage - absorbed),
        0,
        max
      );

  } else {

    nextCurrent =
      clamp(
        current + delta,
        0,
        max
      );
  }

  currentInput.setAttribute(
    'value',
    String(nextCurrent)
  );

  currentInput.value =
    String(nextCurrent);

  setBlockTempHp(
    block,
    nextTemp
  );

  page.content =
    replaceMarkdownBody(
      page.content,
      wrapper.innerHTML
    );

  return {
    current: nextCurrent,
    max,
    temp: nextTemp
  };
}


export function updatePageDndCurrentHp(
  page,
  delta
) {

  return updatePageDndHealth(
    page,
    {
      delta
    }
  );
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


function getBlockTempHp(
  block
) {

  const value =
    Number(
      block?.dataset?.tempHp || 0
    );

  return Number.isFinite(value)
    ? Math.max(
      0,
      Math.floor(value)
    )
    : 0;
}


function setBlockTempHp(
  block,
  value
) {

  if (!block) return;

  const next =
    Math.max(
      0,
      Math.floor(
        Number(value) || 0
      )
    );

  if (next > 0) {

    block.dataset.tempHp =
      String(next);

    return;
  }

  delete block.dataset.tempHp;
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
