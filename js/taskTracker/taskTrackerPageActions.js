import {
  parseMarkdown
} from '../core/markdown.js';

import {
  writePageContent
} from '../storage/storage.js';

import {
  TaskTrackerModel
} from './taskTrackerModel.js';

import {
  readTaskTrackerData
} from './taskTrackerReadData.js';

import {
  writeTaskTrackerData
} from './taskTrackerWriteData.js';


export async function addTaskToTrackerPage(
  trackerPage
) {

  if (!trackerPage) return null;

  const parsed =
    parseMarkdown(
      trackerPage.content
    );

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    parsed.body;

  const tracker =
    wrapper.querySelector(
      '.task-tracker-document'
    );

  if (!tracker) return null;

  const model =
    new TaskTrackerModel(
      readTaskTrackerData(
        tracker
      )
    );

  const targetColumn =
    findBacklogColumn(
      model.data.columns
    ) ||
    model.data.columns[0];

  if (!targetColumn) return null;

  const task =
    model.addTask(
      targetColumn.id
    );

  writeTaskTrackerData(
    tracker,
    model.data
  );

  const content =
`---
id: ${trackerPage.id}
parent: ${trackerPage.parent ?? 'null'}
order: ${trackerPage.order ?? Date.now()}
tags: [${(trackerPage.tags || parsed.tags || []).join(', ')}]
template: taskTracker
type: taskTracker
aliases: [${(trackerPage.aliases || parsed.aliases || []).join(', ')}]
---

${wrapper.innerHTML}
`;

  await writePageContent(
    trackerPage,
    content
  );

  trackerPage.content =
    content;

  return task;
}


function findBacklogColumn(
  columns
) {

  return columns.find(column => {

    const title =
      String(column.title || '')
        .trim()
        .toLowerCase();

    return title === 'бэклог' ||
      title === 'backlog';
  });
}
