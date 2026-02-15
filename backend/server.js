const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3109;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');
const HISTORY_FILE = path.join(__dirname, 'data', 'history.json');
const ACTIVITY_FILE = path.join(__dirname, 'data', 'activity.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// AI Classification Keywords
const AI_CATEGORIES = {
  development: ['code', 'develop', 'programming', 'build', 'implement', 'feature', 'bug', 'fix', 'debug', 'api', 'backend', 'frontend', 'database', 'deploy', 'release', 'refactor', 'test', 'unit test', 'integration'],
  design: ['design', 'ui', 'ux', 'mockup', 'wireframe', 'prototype', 'figma', 'sketch', 'layout', 'visual', 'brand', 'logo', 'icon', 'style', 'color', 'typography'],
  marketing: ['marketing', 'campaign', 'social', 'content', 'seo', 'analytics', 'ads', 'promotion', 'email', 'newsletter', 'launch', 'audience', 'engagement'],
  planning: ['plan', 'strategy', 'roadmap', 'scope', 'requirements', 'kickoff', 'meeting', 'review', 'retrospective', 'sprint', 'milestone', 'deadline', 'schedule'],
  research: ['research', 'analyze', 'study', 'explore', 'investigate', 'evaluate', 'compare', 'benchmark', 'survey', 'interview', 'data'],
  documentation: ['document', 'write', 'documentation', 'readme', 'guide', 'tutorial', 'manual', 'specs', 'wiki'],
  operations: ['deploy', 'server', 'infrastructure', 'devops', 'ci/cd', 'monitoring', 'backup', 'security', 'performance', 'scaling'],
  communication: ['call', 'meeting', 'sync', 'present', 'demo', 'stakeholder', 'client', 'feedback', 'report', 'update']
};

const AI_PRIORITY_KEYWORDS = {
  critical: ['urgent', 'critical', 'asap', 'emergency', 'blocker', 'production', 'outage', 'security', 'immediately', 'hotfix'],
  high: ['important', 'priority', 'deadline', 'release', 'launch', 'demo', 'client', 'key', 'essential', 'must'],
  medium: ['should', 'needed', 'planned', 'scheduled', 'next', 'upcoming', 'regular'],
  low: ['nice to have', 'optional', 'later', 'backlog', 'someday', 'minor', 'consider', 'idea', 'explore']
};

const AI_TIME_ESTIMATES = {
  quick: { keywords: ['quick', 'simple', 'small', 'minor', 'typo', 'update', 'tweak'], hours: 1 },
  short: { keywords: ['add', 'create', 'implement', 'basic', 'standard'], hours: 4 },
  medium: { keywords: ['feature', 'develop', 'build', 'integrate', 'design'], hours: 16 },
  long: { keywords: ['complex', 'major', 'refactor', 'overhaul', 'redesign', 'architecture'], hours: 40 },
  epic: { keywords: ['epic', 'project', 'initiative', 'platform', 'system'], hours: 80 }
};

// AI Classification Functions
function classifyTask(name, description = '') {
  const text = `${name} ${description}`.toLowerCase();
  const scores = {};

  for (const [category, keywords] of Object.entries(AI_CATEGORIES)) {
    scores[category] = keywords.filter(kw => text.includes(kw)).length;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'general';

  return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'general';
}

function suggestPriority(name, description = '') {
  const text = `${name} ${description}`.toLowerCase();

  for (const [priority, keywords] of Object.entries(AI_PRIORITY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return priority;
    }
  }
  return 'medium';
}

function estimateTime(name, description = '') {
  const text = `${name} ${description}`.toLowerCase();

  for (const [_, config] of Object.entries(AI_TIME_ESTIMATES)) {
    if (config.keywords.some(kw => text.includes(kw))) {
      return config.hours;
    }
  }
  return 8; // Default 1 day
}

function suggestTags(name, description = '') {
  const text = `${name} ${description}`.toLowerCase();
  const tags = [];

  const tagPatterns = {
    'bug': ['bug', 'fix', 'issue', 'error', 'broken'],
    'feature': ['feature', 'new', 'add', 'implement'],
    'improvement': ['improve', 'enhance', 'optimize', 'refactor'],
    'urgent': ['urgent', 'asap', 'critical', 'blocker'],
    'review': ['review', 'feedback', 'check'],
    'testing': ['test', 'qa', 'verify', 'validate'],
    'documentation': ['doc', 'readme', 'guide', 'wiki'],
    'meeting': ['meeting', 'call', 'sync', 'standup']
  };

  for (const [tag, keywords] of Object.entries(tagPatterns)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5);
}

function generateSmartSuggestions(tasks) {
  const suggestions = [];
  const today = new Date().toISOString().split('T')[0];

  // Find overdue tasks
  const overdueTasks = tasks.filter(t => t.end < today && t.status !== 'completed');
  if (overdueTasks.length > 0) {
    suggestions.push({
      type: 'warning',
      title: 'Overdue Tasks',
      message: `You have ${overdueTasks.length} overdue task(s) that need attention`,
      action: 'filter_overdue',
      tasks: overdueTasks.map(t => t.id)
    });
  }

  // Find tasks due today
  const dueTodayTasks = tasks.filter(t => t.end === today && t.status !== 'completed');
  if (dueTodayTasks.length > 0) {
    suggestions.push({
      type: 'info',
      title: 'Due Today',
      message: `${dueTodayTasks.length} task(s) are due today`,
      action: 'filter_today',
      tasks: dueTodayTasks.map(t => t.id)
    });
  }

  // Find high priority tasks not started
  const highPriorityNotStarted = tasks.filter(t =>
    (t.priority === 'critical' || t.priority === 'high') && t.status === 'not_started'
  );
  if (highPriorityNotStarted.length > 0) {
    suggestions.push({
      type: 'suggestion',
      title: 'Priority Tasks',
      message: `${highPriorityNotStarted.length} high priority task(s) haven't been started`,
      action: 'filter_priority',
      tasks: highPriorityNotStarted.map(t => t.id)
    });
  }

  // Find tasks with no progress but in progress status
  const stalledTasks = tasks.filter(t => t.status === 'in_progress' && t.progress === 0);
  if (stalledTasks.length > 0) {
    suggestions.push({
      type: 'suggestion',
      title: 'Stalled Tasks',
      message: `${stalledTasks.length} task(s) marked as in progress but have 0% completion`,
      action: 'filter_stalled',
      tasks: stalledTasks.map(t => t.id)
    });
  }

  // Workload balance suggestion
  const thisWeekTasks = tasks.filter(t => {
    const taskEnd = new Date(t.end);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return taskEnd <= nextWeek && t.status !== 'completed';
  });
  if (thisWeekTasks.length > 10) {
    suggestions.push({
      type: 'warning',
      title: 'Heavy Workload',
      message: `You have ${thisWeekTasks.length} tasks due this week. Consider redistributing.`,
      action: 'view_week'
    });
  }

  return suggestions;
}

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    tasks: [],
    projects: [
      { id: 'default', name: 'My Project', description: 'Default project', color: '#4A90D9' }
    ],
    labels: [
      { id: 'bug', name: 'Bug', color: '#E74C3C' },
      { id: 'feature', name: 'Feature', color: '#50C878' },
      { id: 'improvement', name: 'Improvement', color: '#4A90D9' },
      { id: 'urgent', name: 'Urgent', color: '#FF6B6B' },
      { id: 'review', name: 'Review', color: '#9B59B6' },
      { id: 'testing', name: 'Testing', color: '#FFB347' },
      { id: 'documentation', name: 'Documentation', color: '#3498DB' },
      { id: 'meeting', name: 'Meeting', color: '#4ECDC4' }
    ],
    settings: {
      theme: 'dark',
      defaultView: 'gantt',
      showWeekends: true,
      workHoursStart: 9,
      workHoursEnd: 17,
      enableAI: true,
      autoClassify: true
    }
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// Initialize history file
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify({ undoStack: [], redoStack: [] }, null, 2));
}

// Initialize activity file
if (!fs.existsSync(ACTIVITY_FILE)) {
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify({ activities: [] }, null, 2));
}

// Helper functions
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
const readHistory = () => JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
const writeHistory = (history) => fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
const readActivity = () => JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
const writeActivity = (activity) => fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activity, null, 2));

const saveToHistory = (action, previousState) => {
  const history = readHistory();
  history.undoStack.push({ action, state: previousState, timestamp: new Date().toISOString() });
  if (history.undoStack.length > 50) history.undoStack.shift();
  history.redoStack = [];
  writeHistory(history);
};

const logActivity = (action, taskId, taskName, details = {}) => {
  const activity = readActivity();
  activity.activities.unshift({
    id: uuidv4(),
    action,
    taskId,
    taskName,
    details,
    timestamp: new Date().toISOString()
  });
  if (activity.activities.length > 200) activity.activities.pop();
  writeActivity(activity);
};

// Routes

// Get all tasks
app.get('/api/tasks', (req, res) => {
  try {
    const data = readData();
    res.json(data.tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tasks' });
  }
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
  try {
    const data = readData();
    const task = data.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read task' });
  }
});

// Create task
app.post('/api/tasks', (req, res) => {
  try {
    const data = readData();
    const previousState = JSON.parse(JSON.stringify(data.tasks));
    const settings = data.settings || {};

    // AI Classification if enabled
    let category = req.body.category;
    let priority = req.body.priority || 'medium';
    let tags = req.body.tags || [];
    let estimatedHours = req.body.estimatedHours;

    if (settings.autoClassify && settings.enableAI) {
      if (!category) category = classifyTask(req.body.name, req.body.description);
      if (!req.body.priority) priority = suggestPriority(req.body.name, req.body.description);
      if (tags.length === 0) tags = suggestTags(req.body.name, req.body.description);
      if (!estimatedHours) estimatedHours = estimateTime(req.body.name, req.body.description);
    }

    const newTask = {
      id: uuidv4(),
      name: req.body.name || 'New Task',
      start: req.body.start || new Date().toISOString().split('T')[0],
      end: req.body.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: req.body.progress || 0,
      type: req.body.type || 'task',
      status: req.body.status || 'not_started',
      priority,
      category: category || 'general',
      dependencies: req.body.dependencies || [],
      color: req.body.color || '#4A90D9',
      projectId: req.body.projectId || 'default',
      parentId: req.body.parentId || null,
      description: req.body.description || '',
      assignee: req.body.assignee || '',
      tags,
      estimatedHours: estimatedHours || 8,
      actualHours: req.body.actualHours || 0,
      recurring: req.body.recurring || null,
      dueReminder: req.body.dueReminder !== false
    };

    data.tasks.push(newTask);
    writeData(data);
    saveToHistory('create', previousState);
    logActivity('created', newTask.id, newTask.name);

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  try {
    const data = readData();
    const previousState = JSON.parse(JSON.stringify(data.tasks));
    const index = data.tasks.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });

    const oldTask = { ...data.tasks[index] };
    data.tasks[index] = { ...data.tasks[index], ...req.body };
    writeData(data);
    saveToHistory('update', previousState);

    // Log specific changes
    const changes = [];
    if (oldTask.status !== req.body.status) changes.push(`status: ${req.body.status}`);
    if (oldTask.progress !== req.body.progress) changes.push(`progress: ${req.body.progress}%`);
    if (changes.length > 0) {
      logActivity('updated', req.params.id, data.tasks[index].name, { changes });
    }

    res.json(data.tasks[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Batch update tasks
app.put('/api/tasks', (req, res) => {
  try {
    const data = readData();
    const previousState = JSON.parse(JSON.stringify(data.tasks));
    const updates = req.body;

    updates.forEach(update => {
      const index = data.tasks.findIndex(t => t.id === update.id);
      if (index !== -1) {
        data.tasks[index] = { ...data.tasks[index], ...update };
      }
    });

    writeData(data);
    saveToHistory('batch_update', previousState);
    res.json(data.tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tasks' });
  }
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const data = readData();
    const previousState = JSON.parse(JSON.stringify(data.tasks));
    const task = data.tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const taskId = req.params.id;
    data.tasks = data.tasks.filter(t => t.id !== taskId && t.parentId !== taskId);
    data.tasks.forEach(t => {
      t.dependencies = t.dependencies.filter(d => d !== taskId);
    });

    writeData(data);
    saveToHistory('delete', previousState);
    logActivity('deleted', taskId, task.name);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Log time
app.post('/api/tasks/:id/log-time', (req, res) => {
  try {
    const data = readData();
    const index = data.tasks.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Task not found' });

    const hours = parseFloat(req.body.hours) || 0;
    data.tasks[index].actualHours = (data.tasks[index].actualHours || 0) + hours;
    writeData(data);

    logActivity('logged_time', req.params.id, data.tasks[index].name, { hours });
    res.json(data.tasks[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log time' });
  }
});

// AI Classify endpoint
app.post('/api/ai/classify', (req, res) => {
  try {
    const { name, description } = req.body;
    const category = classifyTask(name, description);
    const priority = suggestPriority(name, description);
    const estimatedHours = estimateTime(name, description);
    const tags = suggestTags(name, description);

    res.json({ category, priority, estimatedHours, tags });
  } catch (error) {
    res.status(500).json({ error: 'Failed to classify' });
  }
});

// AI Suggestions
app.get('/api/ai/suggestions', (req, res) => {
  try {
    const data = readData();
    const suggestions = generateSmartSuggestions(data.tasks);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Get projects
app.get('/api/projects', (req, res) => {
  try {
    const data = readData();
    res.json(data.projects || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read projects' });
  }
});

// Create project
app.post('/api/projects', (req, res) => {
  try {
    const data = readData();
    const newProject = {
      id: uuidv4(),
      name: req.body.name || 'New Project',
      description: req.body.description || '',
      color: req.body.color || '#4A90D9'
    };
    if (!data.projects) data.projects = [];
    data.projects.push(newProject);
    writeData(data);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  try {
    const data = readData();
    const index = data.projects.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Project not found' });
    data.projects[index] = { ...data.projects[index], ...req.body };
    writeData(data);
    res.json(data.projects[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  try {
    const data = readData();
    if (req.params.id === 'default') return res.status(400).json({ error: 'Cannot delete default project' });
    data.projects = data.projects.filter(p => p.id !== req.params.id);
    data.tasks.forEach(t => {
      if (t.projectId === req.params.id) t.projectId = 'default';
    });
    writeData(data);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get labels
app.get('/api/labels', (req, res) => {
  try {
    const data = readData();
    res.json(data.labels || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read labels' });
  }
});

// Create label
app.post('/api/labels', (req, res) => {
  try {
    const data = readData();
    const newLabel = {
      id: req.body.id || uuidv4(),
      name: req.body.name,
      color: req.body.color || '#4A90D9'
    };
    if (!data.labels) data.labels = [];
    data.labels.push(newLabel);
    writeData(data);
    res.status(201).json(newLabel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// Get settings
app.get('/api/settings', (req, res) => {
  try {
    const data = readData();
    res.json(data.settings || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Update settings
app.put('/api/settings', (req, res) => {
  try {
    const data = readData();
    data.settings = { ...data.settings, ...req.body };
    writeData(data);
    res.json(data.settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get activity log
app.get('/api/activity', (req, res) => {
  try {
    const activity = readActivity();
    const limit = parseInt(req.query.limit) || 50;
    res.json(activity.activities.slice(0, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read activity' });
  }
});

// Undo
app.post('/api/undo', (req, res) => {
  try {
    const history = readHistory();
    if (history.undoStack.length === 0) return res.status(400).json({ error: 'Nothing to undo' });

    const data = readData();
    const currentState = JSON.parse(JSON.stringify(data.tasks));
    const lastAction = history.undoStack.pop();

    history.redoStack.push({ action: lastAction.action, state: currentState, timestamp: new Date().toISOString() });
    data.tasks = lastAction.state;

    writeData(data);
    writeHistory(history);

    res.json({ tasks: data.tasks, canUndo: history.undoStack.length > 0, canRedo: history.redoStack.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to undo' });
  }
});

// Redo
app.post('/api/redo', (req, res) => {
  try {
    const history = readHistory();
    if (history.redoStack.length === 0) return res.status(400).json({ error: 'Nothing to redo' });

    const data = readData();
    const currentState = JSON.parse(JSON.stringify(data.tasks));
    const lastAction = history.redoStack.pop();

    history.undoStack.push({ action: lastAction.action, state: currentState, timestamp: new Date().toISOString() });
    data.tasks = lastAction.state;

    writeData(data);
    writeHistory(history);

    res.json({ tasks: data.tasks, canUndo: history.undoStack.length > 0, canRedo: history.redoStack.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to redo' });
  }
});

// Get history status
app.get('/api/history', (req, res) => {
  try {
    const history = readHistory();
    res.json({ canUndo: history.undoStack.length > 0, canRedo: history.redoStack.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read history' });
  }
});

// Export data
app.get('/api/export', (req, res) => {
  try {
    const format = req.query.format || 'json';
    const data = readData();

    if (format === 'csv') {
      const headers = ['id', 'name', 'start', 'end', 'progress', 'type', 'status', 'priority', 'category', 'color', 'description', 'assignee', 'projectId', 'estimatedHours', 'actualHours'];
      const csv = [
        headers.join(','),
        ...data.tasks.map(t => headers.map(h => `"${(t[h] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.json');
      res.json(data);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Import data
app.post('/api/import', (req, res) => {
  try {
    const data = readData();
    const previousState = JSON.parse(JSON.stringify(data.tasks));
    const importData = req.body;

    if (importData.tasks) {
      data.tasks = importData.tasks.map(t => ({ ...t, id: t.id || uuidv4() }));
      if (importData.projects) data.projects = importData.projects;
      if (importData.labels) data.labels = importData.labels;
    } else if (Array.isArray(importData)) {
      importData.forEach(t => {
        const existing = data.tasks.findIndex(et => et.id === t.id);
        if (existing !== -1) {
          data.tasks[existing] = { ...data.tasks[existing], ...t };
        } else {
          data.tasks.push({ ...t, id: t.id || uuidv4() });
        }
      });
    }

    writeData(data);
    saveToHistory('import', previousState);

    res.json({ success: true, taskCount: data.tasks.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const data = readData();
    const tasks = data.tasks;
    const today = new Date().toISOString().split('T')[0];

    const stats = {
      total: tasks.length,
      byStatus: {
        not_started: tasks.filter(t => t.status === 'not_started').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        on_hold: tasks.filter(t => t.status === 'on_hold').length
      },
      byPriority: {
        low: tasks.filter(t => t.priority === 'low').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        high: tasks.filter(t => t.priority === 'high').length,
        critical: tasks.filter(t => t.priority === 'critical').length
      },
      byCategory: {},
      byType: {
        task: tasks.filter(t => t.type === 'task').length,
        milestone: tasks.filter(t => t.type === 'milestone').length
      },
      overdue: tasks.filter(t => t.end < today && t.status !== 'completed').length,
      dueToday: tasks.filter(t => t.end === today && t.status !== 'completed').length,
      dueThisWeek: tasks.filter(t => {
        const taskEnd = new Date(t.end);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        return taskEnd <= weekEnd && taskEnd >= new Date() && t.status !== 'completed';
      }).length,
      avgProgress: tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length) : 0,
      completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
      totalEstimatedHours: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
      totalActualHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
      velocity: 0
    };

    // Calculate by category
    tasks.forEach(t => {
      const cat = t.category || 'general';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    });

    // Calculate velocity (tasks completed in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const activity = readActivity();
    stats.velocity = activity.activities.filter(a =>
      a.action === 'updated' &&
      a.details?.changes?.includes('status: completed') &&
      new Date(a.timestamp) >= weekAgo
    ).length;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Dashboard data
app.get('/api/dashboard', (req, res) => {
  try {
    const data = readData();
    const tasks = data.tasks;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Recent activity
    const activity = readActivity();
    const recentActivity = activity.activities.slice(0, 10);

    // Upcoming deadlines
    const upcoming = tasks
      .filter(t => t.status !== 'completed' && t.end >= todayStr)
      .sort((a, b) => new Date(a.end) - new Date(b.end))
      .slice(0, 5);

    // Overdue tasks
    const overdue = tasks
      .filter(t => t.status !== 'completed' && t.end < todayStr)
      .sort((a, b) => new Date(a.end) - new Date(b.end));

    // Progress by category
    const categoryProgress = {};
    tasks.forEach(t => {
      const cat = t.category || 'general';
      if (!categoryProgress[cat]) {
        categoryProgress[cat] = { total: 0, completed: 0, progress: 0 };
      }
      categoryProgress[cat].total++;
      if (t.status === 'completed') categoryProgress[cat].completed++;
      categoryProgress[cat].progress += t.progress || 0;
    });
    Object.keys(categoryProgress).forEach(cat => {
      categoryProgress[cat].avgProgress = Math.round(categoryProgress[cat].progress / categoryProgress[cat].total);
    });

    // AI suggestions
    const suggestions = generateSmartSuggestions(tasks);

    res.json({
      recentActivity,
      upcoming,
      overdue,
      categoryProgress,
      suggestions,
      todaysTasks: tasks.filter(t => t.start <= todayStr && t.end >= todayStr && t.status !== 'completed')
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

app.listen(PORT, () => {
  console.log(`Task Flow API running on http://localhost:${PORT}`);
});
