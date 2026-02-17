require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3109;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    if (keywords.some(kw => text.includes(kw))) return priority;
  }
  return 'medium';
}

function estimateTime(name, description = '') {
  const text = `${name} ${description}`.toLowerCase();
  for (const [_, config] of Object.entries(AI_TIME_ESTIMATES)) {
    if (config.keywords.some(kw => text.includes(kw))) return config.hours;
  }
  return 8;
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
    if (keywords.some(kw => text.includes(kw))) tags.push(tag);
  }
  return tags.slice(0, 5);
}

function generateSmartSuggestions(tasks) {
  const suggestions = [];
  const today = new Date().toISOString().split('T')[0];

  const overdueTasks = tasks.filter(t => t.end_date < today && t.status !== 'completed');
  if (overdueTasks.length > 0) {
    suggestions.push({
      type: 'warning',
      title: 'Overdue Tasks',
      message: `You have ${overdueTasks.length} overdue task(s) that need attention`,
      action: 'filter_overdue',
      tasks: overdueTasks.map(t => t.id)
    });
  }

  const dueTodayTasks = tasks.filter(t => t.end_date === today && t.status !== 'completed');
  if (dueTodayTasks.length > 0) {
    suggestions.push({
      type: 'info',
      title: 'Due Today',
      message: `${dueTodayTasks.length} task(s) are due today`,
      action: 'filter_today',
      tasks: dueTodayTasks.map(t => t.id)
    });
  }

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

  if (suggestions.length === 0) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 2), 0);
    const completedHours = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.estimated_hours || 2), 0);

    if (totalTasks > 0) {
      const completionRate = Math.round((completedTasks / totalTasks) * 100);
      suggestions.push({
        type: 'info',
        title: 'Progress Summary',
        message: `${completedTasks}/${totalTasks} tasks done (${completionRate}%). ${pendingTasks} remaining.`
      });
      if (pendingTasks > 0) {
        const avgHoursPerTask = Math.round((totalHours - completedHours) / pendingTasks);
        suggestions.push({
          type: 'suggestion',
          title: 'Time Estimate',
          message: `~${totalHours - completedHours}h of work remaining (avg ${avgHoursPerTask}h/task)`
        });
      }
    } else {
      suggestions.push({
        type: 'info',
        title: 'Getting Started',
        message: 'Add your first task to get AI-powered insights and suggestions.'
      });
    }
  }

  return suggestions;
}

// Helper to convert Supabase task to frontend format
function toFrontendTask(task) {
  return {
    id: task.id,
    name: task.name,
    description: task.description || '',
    start: task.start_date,
    end: task.end_date,
    progress: task.progress || 0,
    type: task.type || 'task',
    status: task.status || 'not_started',
    priority: task.priority || 'medium',
    category: task.category || 'general',
    color: task.color || '#4A90D9',
    projectId: task.project_id || 'default',
    parentId: task.parent_id,
    dependencies: task.dependencies || [],
    assignee: task.assignee || '',
    tags: task.tags || [],
    estimatedHours: task.estimated_hours || 8,
    actualHours: task.actual_hours || 0,
    scheduledDate: task.scheduled_date,
    reminderTime: task.reminder_time,
    reminderEnabled: task.reminder_enabled || false,
    dueReminder: task.due_reminder !== false,
    recurring: task.recurring
  };
}

// Helper to convert frontend task to Supabase format
function toSupabaseTask(task) {
  return {
    name: task.name,
    description: task.description || '',
    start_date: task.start,
    end_date: task.end,
    progress: task.progress || 0,
    type: task.type || 'task',
    status: task.status || 'not_started',
    priority: task.priority || 'medium',
    category: task.category || 'general',
    color: task.color || '#4A90D9',
    project_id: task.projectId === 'default' ? '00000000-0000-0000-0000-000000000001' : task.projectId,
    parent_id: task.parentId || null,
    dependencies: task.dependencies || [],
    assignee: task.assignee || '',
    tags: task.tags || [],
    estimated_hours: task.estimatedHours || 8,
    actual_hours: task.actualHours || 0,
    scheduled_date: task.scheduledDate || null,
    reminder_time: task.reminderTime || null,
    reminder_enabled: task.reminderEnabled || false,
    due_reminder: task.dueReminder !== false,
    recurring: task.recurring || null
  };
}

// Activity logging
async function logActivity(action, taskId, taskName, details = {}) {
  try {
    await supabase.from('activity_log').insert({
      action,
      task_id: taskId,
      task_name: taskName,
      details
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// History management for undo/redo
let undoStack = [];
let redoStack = [];

async function saveToHistory(action, previousState) {
  undoStack.push({ action, state: previousState, timestamp: new Date().toISOString() });
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}

// ============ ROUTES ============

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data.map(toFrontendTask));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });
    res.json(toFrontendTask(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const taskData = toSupabaseTask(req.body);

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;

    const frontendTask = toFrontendTask(data);
    await logActivity('created', data.id, data.name);
    res.status(201).json(frontendTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    // Get current state for history
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    const updateData = {};
    const fields = ['name', 'description', 'start', 'end', 'progress', 'type', 'status',
                    'priority', 'category', 'color', 'projectId', 'parentId', 'dependencies',
                    'assignee', 'tags', 'estimatedHours', 'actualHours', 'scheduledDate',
                    'reminderTime', 'reminderEnabled', 'dueReminder', 'recurring'];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        const supabaseField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (field === 'start') updateData.start_date = req.body.start;
        else if (field === 'end') updateData.end_date = req.body.end;
        else if (field === 'projectId') updateData.project_id = req.body.projectId === 'default' ? '00000000-0000-0000-0000-000000000001' : req.body.projectId;
        else if (field === 'parentId') updateData.parent_id = req.body.parentId;
        else updateData[supabaseField] = req.body[field];
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });

    if (currentTask) {
      await saveToHistory('update', { tasks: [toFrontendTask(currentTask)] });
    }
    await logActivity('updated', data.id, data.name, { fields: Object.keys(updateData) });

    res.json(toFrontendTask(data));
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    if (task) {
      await saveToHistory('delete', { tasks: [toFrontendTask(task)] });
      await logActivity('deleted', task.id, task.name);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Batch update tasks
app.put('/api/tasks/batch/update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    const updateData = {};

    for (const [key, value] of Object.entries(updates)) {
      const supabaseField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (key === 'start') updateData.start_date = value;
      else if (key === 'end') updateData.end_date = value;
      else updateData[supabaseField] = value;
    }

    for (const id of ids) {
      await supabase.from('tasks').update(updateData).eq('id', id);
    }

    const { data } = await supabase.from('tasks').select('*').in('id', ids);
    res.json(data.map(toFrontendTask));
  } catch (error) {
    res.status(500).json({ error: 'Failed to batch update tasks' });
  }
});

// Auto-move tasks
app.post('/api/tasks/auto-move', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: tasks, error } = await supabase.from('tasks').select('*');
    if (error) throw error;

    let movedCount = 0;
    const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };

    for (const task of tasks) {
      if (task.status === 'completed') continue;

      const priorityValue = priorityMap[task.priority] ?? 2;
      let shouldUpdate = false;
      let newScheduledDate = task.scheduled_date;

      // Overdue tasks
      if (task.end_date < today && task.scheduled_date !== today) {
        if (priorityValue <= 1) {
          newScheduledDate = today;
          shouldUpdate = true;
        } else {
          newScheduledDate = 'soon';
          shouldUpdate = true;
        }
      }
      // Backlog tasks with active date range
      else if (!task.scheduled_date && task.start_date && task.end_date &&
               task.start_date <= today && task.end_date >= today) {
        if (priorityValue <= 1) {
          newScheduledDate = today;
          shouldUpdate = true;
        } else {
          newScheduledDate = 'soon';
          shouldUpdate = true;
        }
      }

      if (shouldUpdate && newScheduledDate !== task.scheduled_date) {
        await supabase.from('tasks').update({ scheduled_date: newScheduledDate }).eq('id', task.id);
        movedCount++;
      }
    }

    const { data: updatedTasks } = await supabase.from('tasks').select('*');
    res.json({ moved: movedCount, tasks: updatedTasks.map(toFrontendTask) });
  } catch (error) {
    console.error('Auto-move error:', error);
    res.status(500).json({ error: 'Failed to auto-move tasks' });
  }
});

// AI Classification
app.post('/api/ai/classify', (req, res) => {
  try {
    const { name, description } = req.body;
    res.json({
      category: classifyTask(name, description),
      priority: suggestPriority(name, description),
      estimatedHours: estimateTime(name, description),
      tags: suggestTags(name, description)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to classify task' });
  }
});

// AI Suggestions
app.get('/api/ai/suggestions', async (req, res) => {
  try {
    const { data: tasks } = await supabase.from('tasks').select('*');
    const suggestions = generateSmartSuggestions(tasks || []);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Projects
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: req.body.name || 'New Project',
        description: req.body.description || '',
        color: req.body.color || '#4A90D9'
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Labels
app.get('/api/labels', async (req, res) => {
  try {
    const { data, error } = await supabase.from('labels').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const { data: tasks } = await supabase.from('tasks').select('*');
    const taskList = tasks || [];

    const byStatus = { not_started: 0, in_progress: 0, completed: 0, on_hold: 0 };
    const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
    const byCategory = {};
    let totalEstimatedHours = 0;
    let totalActualHours = 0;

    for (const task of taskList) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      byCategory[task.category] = (byCategory[task.category] || 0) + 1;
      totalEstimatedHours += task.estimated_hours || 0;
      totalActualHours += task.actual_hours || 0;
    }

    res.json({
      total: taskList.length,
      byStatus,
      byPriority,
      byCategory,
      totalEstimatedHours,
      totalActualHours
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const { data: tasks } = await supabase.from('tasks').select('*');
    const { data: activities } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const taskList = tasks || [];
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const upcoming = taskList.filter(t => t.end_date >= today && t.end_date <= nextWeek && t.status !== 'completed');
    const overdue = taskList.filter(t => t.end_date < today && t.status !== 'completed');

    const categoryProgress = {};
    for (const task of taskList) {
      if (!categoryProgress[task.category]) {
        categoryProgress[task.category] = { total: 0, completed: 0 };
      }
      categoryProgress[task.category].total++;
      if (task.status === 'completed') categoryProgress[task.category].completed++;
    }

    res.json({
      recentActivity: (activities || []).map(a => ({
        id: a.id,
        action: a.action,
        taskId: a.task_id,
        taskName: a.task_name,
        details: a.details,
        timestamp: a.created_at
      })),
      upcoming: upcoming.map(toFrontendTask),
      overdue: overdue.map(toFrontendTask),
      categoryProgress,
      suggestions: generateSmartSuggestions(taskList),
      todaysTasks: taskList.filter(t => t.start_date <= today && t.end_date >= today && t.status !== 'completed').map(toFrontendTask)
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// Activity
app.get('/api/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json((data || []).map(a => ({
      id: a.id,
      action: a.action,
      taskId: a.task_id,
      taskName: a.task_name,
      details: a.details,
      timestamp: a.created_at
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Undo/Redo (in-memory for now)
app.post('/api/undo', async (req, res) => {
  try {
    if (undoStack.length === 0) return res.status(400).json({ error: 'Nothing to undo' });

    const { data: currentTasks } = await supabase.from('tasks').select('*');
    const lastAction = undoStack.pop();

    redoStack.push({ action: lastAction.action, state: { tasks: currentTasks.map(toFrontendTask) }, timestamp: new Date().toISOString() });

    // This is a simplified undo - for full undo we'd need to restore the exact state
    // For now, just return current state
    const { data: tasks } = await supabase.from('tasks').select('*');
    res.json({ tasks: tasks.map(toFrontendTask), canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to undo' });
  }
});

app.post('/api/redo', async (req, res) => {
  try {
    if (redoStack.length === 0) return res.status(400).json({ error: 'Nothing to redo' });

    const { data: currentTasks } = await supabase.from('tasks').select('*');
    const lastAction = redoStack.pop();

    undoStack.push({ action: lastAction.action, state: { tasks: currentTasks.map(toFrontendTask) }, timestamp: new Date().toISOString() });

    const { data: tasks } = await supabase.from('tasks').select('*');
    res.json({ tasks: tasks.map(toFrontendTask), canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to redo' });
  }
});

app.get('/api/history', (req, res) => {
  res.json({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
});

// Export
app.get('/api/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const { data: tasks } = await supabase.from('tasks').select('*');
    const { data: projects } = await supabase.from('projects').select('*');

    const exportData = {
      tasks: (tasks || []).map(toFrontendTask),
      projects: projects || [],
      exportedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      const headers = ['Name', 'Status', 'Priority', 'Category', 'Start', 'End', 'Progress', 'Estimated Hours'];
      const rows = exportData.tasks.map(t => [t.name, t.status, t.priority, t.category, t.start, t.end, t.progress, t.estimatedHours]);
      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.json');
      res.send(JSON.stringify(exportData, null, 2));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to export' });
  }
});

// Import
app.post('/api/import', async (req, res) => {
  try {
    const { tasks } = req.body;
    let importedCount = 0;

    for (const task of tasks) {
      await supabase.from('tasks').insert(toSupabaseTask(task));
      importedCount++;
    }

    const { data: allTasks } = await supabase.from('tasks').select('*');
    res.json({ imported: importedCount, tasks: allTasks.map(toFrontendTask) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tasks').select('count').limit(1);
    res.json({ status: 'ok', database: error ? 'error' : 'connected' });
  } catch (error) {
    res.json({ status: 'ok', database: 'error' });
  }
});

app.listen(PORT, () => {
  console.log(`Task Flow API (Supabase) running on http://localhost:${PORT}`);
});
