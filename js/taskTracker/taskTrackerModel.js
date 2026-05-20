// Модель Task Tracker — источник истины для колонок, задач и чеклистов.

export class TaskTrackerModel {

  constructor(
    data
  ) {

    this.data =
      data;
  }


  getTask(
    taskId
  ) {

    return this.data.tasks.find(task =>
      task.id === taskId
    ) || null;
  }


  addColumn() {

    const column =
      {
        id: crypto.randomUUID(),
        title: 'Новая колонка',
        taskIds: []
      };

    this.data.columns.push(
      column
    );

    return column;
  }


  renameColumn(
    columnId,
    title
  ) {

    const column =
      this.data.columns.find(item =>
        item.id === columnId
      );

    if (!column) return;

    column.title =
      title.trim() || 'Колонка';
  }


  deleteColumn(
    columnId
  ) {

    if (this.data.columns.length <= 1) return;

    const column =
      this.data.columns.find(item =>
        item.id === columnId
      );

    if (!column) return;

    const taskIds =
      new Set(
        column.taskIds
      );

    this.data.tasks =
      this.data.tasks.filter(task =>
        !taskIds.has(task.id)
      );

    this.data.columns =
      this.data.columns.filter(item =>
        item.id !== columnId
      );
  }


  moveColumn(
    columnId,
    targetIndex
  ) {

    const currentIndex =
      this.data.columns.findIndex(column =>
        column.id === columnId
      );

    if (currentIndex < 0) return;

    const [column] =
      this.data.columns.splice(
        currentIndex,
        1
      );

    const index =
      Math.max(
        0,
        Math.min(
          Number(targetIndex),
          this.data.columns.length
        )
      );

    this.data.columns.splice(
      index,
      0,
      column
    );
  }


  addTask(
    columnId
  ) {

    const task =
      {
        id: crypto.randomUUID(),
        title: 'Новая задача',
        description: '',
        checklist: []
      };

    this.data.tasks.push(
      task
    );

    this.moveTask(
      task.id,
      columnId,
      Number.MAX_SAFE_INTEGER
    );

    return task;
  }


  updateTask(
    taskId,
    patch
  ) {

    const task =
      this.getTask(
        taskId
      );

    if (!task) return;

    Object.assign(
      task,
      patch
    );
  }


  deleteTask(
    taskId
  ) {

    this.data.tasks =
      this.data.tasks.filter(task =>
        task.id !== taskId
      );

    this.data.columns.forEach(column => {

      column.taskIds =
        column.taskIds.filter(id =>
          id !== taskId
        );
    });
  }


  addChecklistItem(
    taskId
  ) {

    const task =
      this.getTask(
        taskId
      );

    if (!task) return null;

    const item =
      {
        id: crypto.randomUUID(),
        text: '',
        done: false
      };

    task.checklist.push(
      item
    );

    return item;
  }


  updateChecklistItem(
    taskId,
    itemId,
    patch
  ) {

    const item =
      this.getTask(taskId)
        ?.checklist
        .find(candidate => candidate.id === itemId);

    if (!item) return;

    Object.assign(
      item,
      patch
    );
  }


  deleteChecklistItem(
    taskId,
    itemId
  ) {

    const task =
      this.getTask(
        taskId
      );

    if (!task) return;

    task.checklist =
      task.checklist.filter(item =>
        item.id !== itemId
      );
  }


  moveTask(
    taskId,
    targetColumnId,
    targetIndex
  ) {

    this.data.columns.forEach(column => {

      column.taskIds =
        column.taskIds.filter(id =>
          id !== taskId
        );
    });

    const column =
      this.data.columns.find(item =>
        item.id === targetColumnId
      );

    if (!column) return;

    const index =
      Math.max(
        0,
        Math.min(
          Number(targetIndex),
          column.taskIds.length
        )
      );

    column.taskIds.splice(
      index,
      0,
      taskId
    );
  }
}
