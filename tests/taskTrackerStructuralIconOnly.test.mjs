import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


test(
  'task tracker icon-only controls are structural, not CSS-hidden text buttons',
  async () => {

    const [
      boardHtml,
      columnHtml,
      taskHtml,
      taskCss
    ] = await Promise.all([
      readFile('js/taskTracker/taskTrackerBoardHTML.js', 'utf8'),
      readFile('js/taskTracker/taskTrackerColumnHTML.js', 'utf8'),
      readFile('js/taskTracker/taskTrackerTaskHTML.js', 'utf8'),
      readFile('styles/task-tracker.css', 'utf8')
    ]);

    assert.doesNotMatch(
      taskCss,
      /font-size\s*:\s*0\b/,
      'Task Tracker must not use font-size: 0 as an icon-only workaround.'
    );

    assert.doesNotMatch(
      taskCss,
      /task-(?:column-add|column-empty)[\s\S]*?display\s*:\s*none/,
      'Task Tracker must not hide old label spans to fake icon-only controls.'
    );

    assert.doesNotMatch(
      boardHtml,
      /task-tracker-boardbar-title[\s\S]*?<span>[^<]+<\/span>/,
      'Boardbar title must not render a hidden text label after the icon.'
    );

    assert.doesNotMatch(
      boardHtml,
      /task-column-add[\s\S]*?<span>[^<]+<\/span>/,
      'Add-column icon-only action must not render a hidden text label.'
    );

    assert.doesNotMatch(
      columnHtml,
      /task-column-empty[\s\S]*?<span>[^<]+<\/span>/,
      'Empty column state must not render visually hidden helper copy as ordinary span text.'
    );

    assert.match(
      columnHtml,
      /aria-label="Колонка пуста"/,
      'Empty column state keeps a screen-reader-accessible label.'
    );

    assert.match(
      boardHtml,
      /class="task-column-add mow-icon-button"/,
      'Add-column action consumes the shared icon-button primitive.'
    );

    for (const source of [
      columnHtml,
      taskHtml
    ]) {

      assert.match(
        source,
        /mow-icon-button/,
        'Task and column icon-only actions consume the shared icon-button primitive.'
      );
    }

    assert.match(
      boardHtml,
      /task-tracker-stat-value/,
      'Task Tracker stats render meaningful dynamic values explicitly.'
    );
  }
);
