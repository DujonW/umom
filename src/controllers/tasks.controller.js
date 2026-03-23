const { getTasks, createTask, updateTask, deleteTask } = require('../services/task.service');
const { generateTaskInitiation } = require('../services/ai.service');
const { assembleContext } = require('../services/context.service');
const { estimateTaskDifficulty } = require('../utils/adhdHelpers');
const { success, error } = require('../utils/responseHelpers');

async function list(req, res, next) {
  try {
    const { status, priority } = req.query;
    const tasks = await getTasks({ status, priority });
    res.json(success(tasks));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const task = await createTask(req.body);
    res.status(201).json(success(task, 'Task created'));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const task = await updateTask(req.params.id, req.body);
    res.json(success(task, 'Task updated'));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await deleteTask(req.params.id);
    res.json(success(null, 'Task archived'));
  } catch (err) {
    next(err);
  }
}

async function initiate(req, res, next) {
  try {
    const { title, description, estimatedMinutes, tags } = req.body;
    const task = { title, description, estimatedMinutes, tags };
    const [difficulty, userContext] = await Promise.all([
      Promise.resolve(estimateTaskDifficulty(task)),
      assembleContext({ days: 3 }),
    ]);
    const coaching = await generateTaskInitiation(task, difficulty, userContext);
    res.json(success({ coaching, difficulty }));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, initiate };
