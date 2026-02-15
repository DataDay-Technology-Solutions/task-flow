import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import './App.css';

const API_URL = 'http://localhost:3109/api';

const COLORS = [
  '#4A90D9', '#7B68EE', '#50C878', '#FFB347', '#FF6B6B',
  '#4ECDC4', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71'
];

const STATUSES = [
  { value: 'not_started', label: 'Not Started', color: '#6c757d' },
  { value: 'in_progress', label: 'In Progress', color: '#4A90D9' },
  { value: 'completed', label: 'Completed', color: '#50C878' },
  { value: 'on_hold', label: 'On Hold', color: '#FFB347' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#6c757d' },
  { value: 'medium', label: 'Medium', color: '#4A90D9' },
  { value: 'high', label: 'High', color: '#FFB347' },
  { value: 'critical', label: 'Critical', color: '#E74C3C' }
];

const CATEGORIES = [
  { value: 'general', label: 'General', icon: '📋' },
  { value: 'development', label: 'Development', icon: '💻' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'planning', label: 'Planning', icon: '📅' },
  { value: 'research', label: 'Research', icon: '🔍' },
  { value: 'documentation', label: 'Documentation', icon: '📝' },
  { value: 'operations', label: 'Operations', icon: '⚙️' },
  { value: 'communication', label: 'Communication', icon: '💬' }
];

const VIEWS = [
  { id: 'gantt', label: 'Gantt', icon: '📊' },
  { id: 'kanban', label: 'Kanban', icon: '📋' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'list', label: 'List', icon: '📝' },
  { id: 'dashboard', label: 'Dashboard', icon: '📈' }
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('gantt');
  const [ganttViewMode, setGanttViewMode] = useState(ViewMode.Day);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', project: '', category: '' });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showDependencyMode, setShowDependencyMode] = useState(false);
  const [dependencySource, setDependencySource] = useState(null);
  const [columnWidth, setColumnWidth] = useState(65);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [timeLogTask, setTimeLogTask] = useState(null);
  const [notification, setNotification] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  // eslint-disable-next-line no-unused-vars
  const [activity, setActivity] = useState([]);
  const fileInputRef = useRef(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    start: '',
    end: '',
    progress: 0,
    color: COLORS[0],
    description: '',
    type: 'task',
    status: 'not_started',
    priority: 'medium',
    category: 'general',
    projectId: 'default',
    parentId: null,
    dependencies: [],
    assignee: '',
    tags: [],
    estimatedHours: 8,
    actualHours: 0,
    recurring: null,
    scheduledDate: null,
    reminderTime: '',
    reminderEnabled: false
  });

  const [kanbanMonth, setKanbanMonth] = useState(new Date());

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch functions
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`);
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/projects`);
      setProjects(await response.json());
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  const fetchLabels = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/labels`);
      setLabels(await response.json());
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      setStats(await response.json());
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard`);
      setDashboard(await response.json());
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, []);

  const fetchHistoryStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/history`);
      const data = await response.json();
      setCanUndo(data.canUndo);
      setCanRedo(data.canRedo);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  const fetchAiSuggestions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/ai/suggestions`);
      setAiSuggestions(await response.json());
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/activity?limit=20`);
      setActivity(await response.json());
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchLabels();
    fetchStats();
    fetchDashboard();
    fetchHistoryStatus();
    fetchAiSuggestions();
    fetchActivity();
  }, [fetchTasks, fetchProjects, fetchLabels, fetchStats, fetchDashboard, fetchHistoryStatus, fetchAiSuggestions, fetchActivity]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); handleAddTask(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); document.querySelector('.search-input')?.focus(); }
      if (e.key === 'Escape') {
        setShowModal(false); setShowStats(false); setShowImportModal(false);
        setShowDependencyMode(false); setDependencySource(null); setShowAiPanel(false);
      }
      if (!showModal && e.key === '1') setCurrentView('gantt');
      if (!showModal && e.key === '2') setCurrentView('kanban');
      if (!showModal && e.key === '3') setCurrentView('calendar');
      if (!showModal && e.key === '4') setCurrentView('list');
      if (!showModal && e.key === '5') setCurrentView('dashboard');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && !e.target.closest('.dropdown')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  // Calculate capacity and workload
  const calculateCapacity = () => {
    const hoursPerDay = 8; // Default work hours per day
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get tasks scheduled for today
    const todaysTasks = tasks.filter(t =>
      t.scheduledDate === todayStr && t.status !== 'completed'
    );
    const todaysHours = todaysTasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);

    // Get tasks in staging (soon)
    const soonTasks = tasks.filter(t =>
      t.scheduledDate === 'soon' && t.status !== 'completed'
    );
    const soonHours = soonTasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);

    // Get tasks in backlog
    const backlogTasks = tasks.filter(t =>
      (t.scheduledDate === null || t.scheduledDate === undefined) && t.status !== 'completed'
    );
    const backlogHours = backlogTasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);

    // Calculate week capacity
    const daysInWeek = 5;
    const weekCapacity = hoursPerDay * daysInWeek;

    // Get this week's scheduled hours
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const thisWeekTasks = tasks.filter(t => {
      if (!t.scheduledDate || t.scheduledDate === 'soon' || t.status === 'completed') return false;
      return t.scheduledDate >= todayStr && t.scheduledDate <= weekEnd.toISOString().split('T')[0];
    });
    const weekHours = thisWeekTasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);

    return {
      hoursPerDay,
      todaysHours,
      todaysCapacity: hoursPerDay,
      todaysAvailable: Math.max(0, hoursPerDay - todaysHours),
      soonHours,
      backlogHours,
      weekHours,
      weekCapacity,
      weekAvailable: Math.max(0, weekCapacity - weekHours),
      isOverloaded: todaysHours > hoursPerDay,
      utilizationPercent: Math.round((todaysHours / hoursPerDay) * 100)
    };
  };

  const capacity = calculateCapacity();

  // AI Smart Scheduling - find best date for a task
  const suggestScheduleDate = (estimatedHours = 2) => {
    const hoursPerDay = 8;
    const today = new Date();

    // Check each day starting from today
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Skip weekends
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Calculate hours already scheduled for this day
      const dayTasks = tasks.filter(t =>
        t.scheduledDate === dateStr && t.status !== 'completed'
      );
      const dayHours = dayTasks.reduce((sum, t) => sum + (t.estimatedHours || 2), 0);

      // If there's room, suggest this day
      if (dayHours + estimatedHours <= hoursPerDay) {
        return dateStr;
      }
    }

    // If all days are full, return 'soon' for staging
    return 'soon';
  };

  const shadeColor = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filters.status || task.status === filters.status;
    const matchesPriority = !filters.priority || task.priority === filters.priority;
    const matchesProject = !filters.project || task.projectId === filters.project;
    const matchesCategory = !filters.category || task.category === filters.category;
    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesCategory;
  });

  // Gantt tasks
  const ganttTasks = filteredTasks.map(task => ({
    ...task,
    start: new Date(task.start),
    end: new Date(task.end),
    progress: task.progress || 0,
    type: task.type === 'milestone' ? 'milestone' : 'task',
    dependencies: task.dependencies || [],
    styles: {
      backgroundColor: task.color || '#4A90D9',
      backgroundSelectedColor: task.color || '#4A90D9',
      progressColor: shadeColor(task.color || '#4A90D9', -20),
      progressSelectedColor: shadeColor(task.color || '#4A90D9', -20)
    }
  }));

  // Task handlers
  const handleTaskChange = async (task) => {
    try {
      await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: task.start.toISOString().split('T')[0],
          end: task.end.toISOString().split('T')[0]
        })
      });
      fetchTasks();
      fetchHistoryStatus();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleProgressChange = async (task) => {
    const newStatus = task.progress === 100 ? 'completed' : task.progress > 0 ? 'in_progress' : 'not_started';
    try {
      await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: task.progress, status: newStatus })
      });
      fetchTasks();
      fetchStats();
      fetchHistoryStatus();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const progress = newStatus === 'completed' ? 100 : newStatus === 'not_started' ? 0 : undefined;
    try {
      await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...(progress !== undefined && { progress }) })
      });
      showNotification(`Task moved to ${STATUSES.find(s => s.value === newStatus)?.label}`, 'success');
      fetchTasks();
      fetchStats();
      fetchActivity();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDoubleClick = (task) => {
    if (showDependencyMode) {
      handleAddDependency(task);
      return;
    }
    const originalTask = tasks.find(t => t.id === task.id);
    if (!originalTask) return;
    setEditingTask(originalTask);
    setFormData({
      name: originalTask.name,
      start: originalTask.start,
      end: originalTask.end,
      progress: originalTask.progress,
      color: originalTask.color || '#4A90D9',
      description: originalTask.description || '',
      type: originalTask.type || 'task',
      status: originalTask.status || 'not_started',
      priority: originalTask.priority || 'medium',
      category: originalTask.category || 'general',
      projectId: originalTask.projectId || 'default',
      parentId: originalTask.parentId || null,
      dependencies: originalTask.dependencies || [],
      assignee: originalTask.assignee || '',
      tags: originalTask.tags || [],
      estimatedHours: originalTask.estimatedHours || 8,
      actualHours: originalTask.actualHours || 0,
      recurring: originalTask.recurring || null,
      scheduledDate: originalTask.scheduledDate || null,
      reminderTime: originalTask.reminderTime || '',
      reminderEnabled: originalTask.reminderEnabled || false
    });
    setShowModal(true);
  };

  const handleAddDependency = async (targetTask) => {
    if (!dependencySource || dependencySource.id === targetTask.id) return;
    const originalTask = tasks.find(t => t.id === targetTask.id);
    const newDependencies = [...(originalTask.dependencies || []), dependencySource.id];
    try {
      await fetch(`${API_URL}/tasks/${targetTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependencies: newDependencies })
      });
      showNotification(`Dependency added`, 'success');
      setShowDependencyMode(false);
      setDependencySource(null);
      fetchTasks();
    } catch (error) {
      showNotification('Failed to add dependency', 'error');
    }
  };

  const handleAddTask = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEditingTask(null);
    setFormData({
      name: '',
      start: today.toISOString().split('T')[0],
      end: nextWeek.toISOString().split('T')[0],
      progress: 0,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      description: '',
      type: 'task',
      status: 'not_started',
      priority: 'medium',
      category: 'general',
      projectId: filters.project || 'default',
      parentId: null,
      dependencies: [],
      assignee: '',
      tags: [],
      estimatedHours: 8,
      actualHours: 0,
      recurring: null,
      scheduledDate: null,
      reminderTime: '',
      reminderEnabled: false
    });
    setShowModal(true);
  };

  const handleAddMilestone = () => {
    const today = new Date();
    setEditingTask(null);
    setFormData({
      name: '',
      start: today.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      progress: 0,
      color: '#E74C3C',
      description: '',
      type: 'milestone',
      status: 'not_started',
      priority: 'high',
      category: 'planning',
      projectId: filters.project || 'default',
      parentId: null,
      dependencies: [],
      assignee: '',
      tags: ['milestone'],
      estimatedHours: 0,
      actualHours: 0,
      recurring: null,
      scheduledDate: null,
      reminderTime: '',
      reminderEnabled: false
    });
    setShowModal(true);
  };

  const handleAiClassify = async () => {
    if (!formData.name) return;
    try {
      const response = await fetch(`${API_URL}/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, description: formData.description })
      });
      const suggestions = await response.json();
      setFormData(prev => ({
        ...prev,
        category: suggestions.category,
        priority: suggestions.priority,
        tags: [...new Set([...prev.tags, ...suggestions.tags])],
        estimatedHours: suggestions.estimatedHours
      }));
      showNotification('AI classification applied', 'success');
    } catch (error) {
      showNotification('AI classification failed', 'error');
    }
  };

  const handleSaveTask = async () => {
    const taskData = { ...formData };
    if (formData.type === 'milestone') taskData.end = formData.start;

    try {
      if (editingTask) {
        await fetch(`${API_URL}/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        showNotification('Task updated', 'success');
      } else {
        await fetch(`${API_URL}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        showNotification('Task created', 'success');
      }
      setShowModal(false);
      fetchTasks();
      fetchStats();
      fetchHistoryStatus();
      fetchActivity();
    } catch (error) {
      showNotification('Failed to save task', 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    try {
      await fetch(`${API_URL}/tasks/${editingTask.id}`, { method: 'DELETE' });
      showNotification('Task deleted', 'success');
      setShowModal(false);
      fetchTasks();
      fetchStats();
      fetchActivity();
    } catch (error) {
      showNotification('Failed to delete task', 'error');
    }
  };

  const handleLogTime = async (hours) => {
    if (!timeLogTask) return;
    try {
      await fetch(`${API_URL}/tasks/${timeLogTask.id}/log-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours })
      });
      showNotification(`Logged ${hours}h`, 'success');
      setShowTimeLogModal(false);
      fetchTasks();
      fetchActivity();
    } catch (error) {
      showNotification('Failed to log time', 'error');
    }
  };

  const handleUndo = async () => {
    try {
      const response = await fetch(`${API_URL}/undo`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo);
        showNotification('Undo successful', 'success');
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  const handleRedo = async () => {
    try {
      const response = await fetch(`${API_URL}/redo`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo);
        showNotification('Redo successful', 'success');
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to redo:', error);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(`${API_URL}/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks.${format}`;
      a.click();
      showNotification(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      showNotification('Export failed', 'error');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      showNotification('Import successful', 'success');
      setShowImportModal(false);
      fetchTasks();
      fetchProjects();
      fetchStats();
    } catch (error) {
      showNotification('Import failed', 'error');
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Intelligent task splitter - breaks tasks by common delimiters
  const splitTaskIntelligently = (text) => {
    const tasks = [];

    // First split by newlines
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

      // Remove bullet points, numbers, etc. at the start
      trimmed = trimmed.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      if (!trimmed) continue;

      // Check if line contains multiple tasks separated by delimiters
      // Look for patterns like: "task1, task2" or "task1 - task2" or "task1 -- task2" or "task1 -task2"

      // Split by double dash patterns: " -- ", " --", "-- "
      if (/ ?-- ?/.test(trimmed)) {
        const subTasks = trimmed.split(/ ?-- ?/).map(t => t.trim()).filter(t => t);
        if (subTasks.length > 1 && subTasks.every(t => t.length > 2)) {
          tasks.push(...subTasks);
          continue;
        }
      }

      // Split by single dash patterns: " - ", " -", "- " (but not at start, and not date ranges)
      if (/ ?- ?/.test(trimmed) && !trimmed.match(/\d{1,2}\s*-\s*\d{1,2}/) && !trimmed.startsWith('-')) {
        const subTasks = trimmed.split(/ ?- ?/).map(t => t.trim()).filter(t => t);
        // Only split if we get reasonable task names (not single words that might be part of a phrase)
        if (subTasks.length > 1 && subTasks.every(t => t.length > 2)) {
          tasks.push(...subTasks);
          continue;
        }
      }

      // Split by comma - but be smart about it
      if (trimmed.includes(',')) {
        const subTasks = trimmed.split(',').map(t => t.trim()).filter(t => t);
        // Only split if each part looks like a task (more than 2 chars, not just numbers)
        if (subTasks.length > 1 && subTasks.every(t => t.length > 2 && !/^\d+$/.test(t))) {
          tasks.push(...subTasks);
          continue;
        }
      }

      // Split by semicolon
      if (trimmed.includes(';')) {
        const subTasks = trimmed.split(';').map(t => t.trim()).filter(t => t);
        if (subTasks.length > 1 && subTasks.every(t => t.length > 2)) {
          tasks.push(...subTasks);
          continue;
        }
      }

      // No delimiter found, add as single task
      tasks.push(trimmed);
    }

    return tasks;
  };

  // Paste import handler - parses text from Apple Reminders or any line-separated list
  const handlePasteImport = async () => {
    if (!pasteText.trim()) {
      showNotification('Please paste some text first', 'error');
      return;
    }

    const taskNames = splitTaskIntelligently(pasteText);
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let importedCount = 0;

    for (const taskName of taskNames) {
      if (!taskName || taskName.length < 2) continue;

      try {
        await fetch(`${API_URL}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: taskName,
            start: today,
            end: nextWeek,
            status: 'not_started',
            priority: 'medium',
            scheduledDate: null // Goes to "Later" staging
          })
        });
        importedCount++;
      } catch (error) {
        console.error('Failed to import task:', taskName, error);
      }
    }

    if (importedCount > 0) {
      showNotification(`Imported ${importedCount} task(s)`, 'success');
      fetchTasks();
      fetchStats();
    } else {
      showNotification('No tasks to import', 'error');
    }

    setShowPasteImport(false);
    setPasteText('');
  };

  // Retroactively split existing tasks that contain delimiters
  const handleSplitExistingTasks = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let splitCount = 0;
    let tasksToDelete = [];

    // Find tasks that can be split
    for (const task of tasks) {
      if (task.status === 'completed') continue;

      const subTasks = splitTaskIntelligently(task.name);

      // Only split if we get more than one task
      if (subTasks.length > 1) {
        // Create new tasks for each sub-task
        for (const subTaskName of subTasks) {
          if (!subTaskName || subTaskName.length < 2) continue;

          try {
            await fetch(`${API_URL}/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: subTaskName,
                start: task.start || today,
                end: task.end || nextWeek,
                status: task.status || 'not_started',
                priority: task.priority || 'medium',
                category: task.category || 'general',
                projectId: task.projectId || 'default',
                scheduledDate: task.scheduledDate,
                color: task.color
              })
            });
            splitCount++;
          } catch (error) {
            console.error('Failed to create split task:', subTaskName, error);
          }
        }

        // Mark original task for deletion
        tasksToDelete.push(task.id);
      }
    }

    // Delete original tasks that were split
    for (const taskId of tasksToDelete) {
      try {
        await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Failed to delete original task:', taskId, error);
      }
    }

    if (splitCount > 0) {
      showNotification(`Split into ${splitCount} tasks (from ${tasksToDelete.length} original)`, 'success');
      fetchTasks();
      fetchStats();
    } else {
      showNotification('No tasks found to split', 'info');
    }
  };

  // Calendar helpers
  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Previous month days
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -i);
      days.unshift({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredTasks.filter(t => t.start <= dateStr && t.end >= dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Render helpers
  const getStatusBadge = (status) => {
    const s = STATUSES.find(st => st.value === status);
    return s ? <span className="status-badge" style={{ backgroundColor: s.color }}>{s.label}</span> : null;
  };

  const getPriorityBadge = (priority) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return p ? <span className="priority-badge" style={{ borderColor: p.color, color: p.color }}>{p.label}</span> : null;
  };

  const getCategoryIcon = (category) => {
    const c = CATEGORIES.find(cat => cat.value === category);
    return c?.icon || '📋';
  };

  // Kanban date-based columns
  const getKanbanDayColumns = () => {
    const year = kanbanMonth.getFullYear();
    const month = kanbanMonth.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    const todayStr = today.toISOString().split('T')[0];

    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const columns = [];

    // Staging columns first
    columns.push({
      id: 'staging_later',
      label: 'Later',
      sublabel: 'Backlog',
      isStaging: true,
      color: '#6c757d',
      tasks: filteredTasks.filter(t =>
        t.status !== 'completed' &&
        (t.scheduledDate === null || t.scheduledDate === undefined)
      )
    });

    columns.push({
      id: 'staging_soon',
      label: 'Soon',
      sublabel: 'Up Next',
      isStaging: true,
      color: '#9B59B6',
      tasks: filteredTasks.filter(t =>
        t.status !== 'completed' && t.scheduledDate === 'soon'
      )
    });

    // Day columns - only from today onwards (skip past days)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      const isPast = date < today;

      // Skip past days - only show today and future
      if (isPast && !isToday) continue;

      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

      columns.push({
        id: dateStr,
        label: day.toString(),
        sublabel: dayOfWeek,
        isStaging: false,
        isToday,
        isPast: false,
        color: isToday ? '#4A90D9' : '#50C878',
        tasks: filteredTasks.filter(t =>
          t.status !== 'completed' && t.scheduledDate === dateStr
        )
      });
    }

    // Completed column at the end
    columns.push({
      id: 'completed',
      label: 'Done',
      sublabel: 'Completed',
      isStaging: false,
      isCompleted: true,
      color: '#50C878',
      tasks: filteredTasks.filter(t => t.status === 'completed')
    });

    return columns;
  };

  const kanbanDayColumns = getKanbanDayColumns();

  // Auto-move overdue tasks on mount
  const autoMoveTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tasks/auto-move`, { method: 'POST' });
      const data = await response.json();
      if (data.moved > 0) {
        showNotification(`${data.moved} overdue task(s) auto-moved`, 'info');
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to auto-move tasks:', error);
    }
  }, []);

  // Auto-move overdue tasks when switching to Kanban view
  useEffect(() => {
    if (currentView === 'kanban') {
      autoMoveTasks();
    }
  }, [currentView, autoMoveTasks]);

  // Handle scheduling a task to a date
  const handleScheduleTask = async (taskId, scheduledDate) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate })
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to schedule task:', error);
    }
  };

  if (loading) {
    return (
      <div className={`loading ${theme}`}>
        <div className="spinner"></div>
        <p>Loading Task Flow...</p>
      </div>
    );
  }

  return (
    <div className={`app ${theme}`}>
      {notification && (
        <div className={`notification ${notification.type}`}>{notification.message}</div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>Task Flow</h1>
        </div>

        <div className="header-center">
          <div className="view-tabs">
            {VIEWS.map(view => (
              <button
                key={view.id}
                className={`view-tab ${currentView === view.id ? 'active' : ''}`}
                onClick={() => setCurrentView(view.id)}
                title={view.label}
              >
                <span className="view-icon">{view.icon}</span>
                <span className="view-label">{view.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="header-right">
          <div className="toolbar">
            <button className={`toolbar-btn ${!canUndo ? 'disabled' : ''}`} onClick={handleUndo} disabled={!canUndo} title="Undo">↶</button>
            <button className={`toolbar-btn ${!canRedo ? 'disabled' : ''}`} onClick={handleRedo} disabled={!canRedo} title="Redo">↷</button>
            <div className="toolbar-divider"></div>
            <button className={`toolbar-btn ${showAiPanel ? 'active' : ''}`} onClick={() => setShowAiPanel(!showAiPanel)} title="AI Suggestions">🤖</button>
            <button className="toolbar-btn" onClick={() => setShowStats(true)} title="Statistics">📊</button>
            <button className="toolbar-btn" onClick={toggleTheme} title="Toggle Theme">{theme === 'dark' ? '☀️' : '🌙'}</button>
            <button className="toolbar-btn" onClick={() => setShowSidebar(!showSidebar)} title="Toggle Sidebar">☰</button>
          </div>

          <div className="action-buttons">
            <button className="add-btn" onClick={handleAddTask}>+ Task</button>
            <button className="milestone-btn" onClick={handleAddMilestone}>◆ Milestone</button>
            <div className="dropdown">
              <button className="more-btn" onClick={() => setShowDropdown(!showDropdown)}>⋯</button>
              {showDropdown && (
                <div className="dropdown-content show">
                  <button onClick={() => { handleExport('json'); setShowDropdown(false); }}>Export JSON</button>
                  <button onClick={() => { handleExport('csv'); setShowDropdown(false); }}>Export CSV</button>
                  <button onClick={() => { setShowImportModal(true); setShowDropdown(false); }}>Import JSON</button>
                  <button onClick={() => { setShowPasteImport(true); setShowDropdown(false); }}>📋 Paste Import</button>
                  <button onClick={() => { handleSplitExistingTasks(); setShowDropdown(false); }}>✂️ Split Tasks</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header with filters */}
      <div className="sub-header">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search tasks... (Ctrl+F)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>}
        </div>

        <div className="filter-group">
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="filter-select">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} className="filter-select">
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="filter-select">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })} className="filter-select">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {currentView === 'gantt' && (
          <div className="gantt-controls">
            <div className="view-controls">
              <button className={ganttViewMode === ViewMode.Hour ? 'active' : ''} onClick={() => setGanttViewMode(ViewMode.Hour)}>Hour</button>
              <button className={ganttViewMode === ViewMode.Day ? 'active' : ''} onClick={() => setGanttViewMode(ViewMode.Day)}>Day</button>
              <button className={ganttViewMode === ViewMode.Week ? 'active' : ''} onClick={() => setGanttViewMode(ViewMode.Week)}>Week</button>
              <button className={ganttViewMode === ViewMode.Month ? 'active' : ''} onClick={() => setGanttViewMode(ViewMode.Month)}>Month</button>
            </div>
            <div className="zoom-controls">
              <button onClick={() => setColumnWidth(prev => Math.max(prev - 10, 30))}>−</button>
              <span>{Math.round((columnWidth / 65) * 100)}%</span>
              <button onClick={() => setColumnWidth(prev => Math.min(prev + 10, 150))}>+</button>
            </div>
          </div>
        )}

        {currentView === 'kanban' && (
          <div className="kanban-month-controls">
            <button onClick={() => setKanbanMonth(new Date(kanbanMonth.getFullYear(), kanbanMonth.getMonth() - 1))}>◀</button>
            <span className="kanban-month-title">{kanbanMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setKanbanMonth(new Date(kanbanMonth.getFullYear(), kanbanMonth.getMonth() + 1))}>▶</button>
            <button className="today-btn" onClick={() => setKanbanMonth(new Date())}>Today</button>
            <button className="auto-move-btn" onClick={autoMoveTasks}>🔄 Auto-Move</button>
            <div className="capacity-indicator">
              <span className={`capacity-badge ${capacity.isOverloaded ? 'overloaded' : capacity.utilizationPercent > 80 ? 'busy' : 'available'}`}>
                📊 Today: {capacity.todaysHours}h / {capacity.todaysCapacity}h
                {capacity.isOverloaded && ' ⚠️'}
              </span>
              <span className="capacity-week">Week: {capacity.weekHours}h / {capacity.weekCapacity}h</span>
            </div>
          </div>
        )}

        {currentView === 'calendar' && (
          <div className="calendar-controls">
            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}>◀</button>
            <span className="calendar-title">{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}>▶</button>
            <button className="today-btn" onClick={() => setCalendarDate(new Date())}>Today</button>
          </div>
        )}
      </div>

      {/* AI Suggestions Panel */}
      {showAiPanel && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <h3>🤖 AI Suggestions</h3>
            <button onClick={() => setShowAiPanel(false)}>×</button>
          </div>
          <div className="ai-suggestions">
            {aiSuggestions.length === 0 ? (
              <p className="no-suggestions">No suggestions at this time</p>
            ) : (
              aiSuggestions.map((suggestion, i) => (
                <div key={i} className={`ai-suggestion ${suggestion.type}`}>
                  <div className="suggestion-title">{suggestion.title}</div>
                  <div className="suggestion-message">{suggestion.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showDependencyMode && (
        <div className="dependency-banner">
          <span>🔗 Click a task to link "{dependencySource?.name}" → target</span>
          <button onClick={() => { setShowDependencyMode(false); setDependencySource(null); }}>Cancel</button>
        </div>
      )}

      {/* Main Content */}
      <main className={`main ${showSidebar ? 'with-sidebar' : ''}`}>
        {/* Gantt View */}
        {currentView === 'gantt' && (
          ganttTasks.length > 0 ? (
            <div className="gantt-container">
              <Gantt
                tasks={ganttTasks}
                viewMode={ganttViewMode}
                onDateChange={handleTaskChange}
                onProgressChange={handleProgressChange}
                onDoubleClick={handleDoubleClick}
                listCellWidth=""
                columnWidth={ganttViewMode === ViewMode.Month ? 300 : ganttViewMode === ViewMode.Week ? 250 : columnWidth}
                barCornerRadius={4}
                barFill={60}
                handleWidth={8}
                todayColor={theme === 'dark' ? 'rgba(74, 144, 217, 0.2)' : 'rgba(74, 144, 217, 0.3)'}
                rowHeight={50}
                fontSize="13px"
              />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h2>No tasks found</h2>
              <p>{searchQuery || Object.values(filters).some(f => f) ? 'Try adjusting filters' : 'Create your first task'}</p>
              <button className="add-btn" onClick={handleAddTask}>+ Add Task</button>
            </div>
          )
        )}

        {/* Kanban View - Date-based */}
        {currentView === 'kanban' && (
          <div className="kanban-date-board">
            <div className="kanban-scroll-container">
              {kanbanDayColumns.map(column => (
                <div
                  key={column.id}
                  className={`kanban-day-column ${column.isStaging ? 'staging' : ''} ${column.isToday ? 'today' : ''} ${column.isPast ? 'past' : ''} ${column.isCompleted ? 'completed' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedTask) {
                      if (column.isCompleted) {
                        handleStatusChange(draggedTask.id, 'completed');
                      } else if (column.isStaging) {
                        handleScheduleTask(draggedTask.id, column.id === 'staging_later' ? null : 'soon');
                      } else {
                        handleScheduleTask(draggedTask.id, column.id);
                      }
                      setDraggedTask(null);
                    }
                  }}
                >
                  <div className="kanban-day-header" style={{ borderBottomColor: column.color }}>
                    <span className="kanban-day-label">{column.label}</span>
                    <span className="kanban-day-sublabel">{column.sublabel}</span>
                    {column.tasks.length > 0 && <span className="kanban-day-count">{column.tasks.length}</span>}
                  </div>
                  <div className="kanban-day-tasks">
                    {column.tasks
                      .sort((a, b) => {
                        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
                      })
                      .map(task => (
                        <div
                          key={task.id}
                          className={`kanban-day-card priority-${task.priority}`}
                          draggable
                          onDragStart={() => setDraggedTask(task)}
                          onClick={() => handleDoubleClick({ id: task.id })}
                          style={{ borderLeftColor: task.color }}
                        >
                          <div className="kanban-card-priority-indicator" style={{ backgroundColor: PRIORITIES.find(p => p.value === task.priority)?.color }}></div>
                          <div className="kanban-card-content">
                            <div className="kanban-card-title">{task.name}</div>
                            {task.reminderTime && (
                              <div className="kanban-card-reminder">
                                🔔 {task.reminderTime}
                              </div>
                            )}
                            <div className="kanban-card-footer">
                              <span className="kanban-card-category">{getCategoryIcon(task.category)}</span>
                              {task.assignee && <span className="kanban-card-assignee">👤</span>}
                              <div className="kanban-card-progress-mini">
                                <div className="progress-fill" style={{ width: `${task.progress}%`, backgroundColor: task.color }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <div className="calendar-view">
            <div className="calendar-grid">
              <div className="calendar-header-row">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="calendar-header-cell">{day}</div>
                ))}
              </div>
              <div className="calendar-body">
                {getCalendarDays().map((day, i) => (
                  <div
                    key={i}
                    className={`calendar-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''}`}
                  >
                    <div className="calendar-date">{day.date.getDate()}</div>
                    <div className="calendar-tasks">
                      {getTasksForDate(day.date).slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className="calendar-task"
                          style={{ backgroundColor: task.color }}
                          onClick={() => handleDoubleClick({ id: task.id })}
                          title={task.name}
                        >
                          {task.type === 'milestone' ? '◆' : ''} {task.name}
                        </div>
                      ))}
                      {getTasksForDate(day.date).length > 3 && (
                        <div className="calendar-more">+{getTasksForDate(day.date).length - 3} more</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div className="list-view">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Est. Hours</th>
                  <th>Actual Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id} className={task.type === 'milestone' ? 'milestone-row' : ''}>
                    <td>
                      <div className="task-cell" style={{ borderLeftColor: task.color }}>
                        {task.type === 'milestone' && '◆ '}
                        {task.name}
                      </div>
                    </td>
                    <td>{getCategoryIcon(task.category)} {CATEGORIES.find(c => c.value === task.category)?.label}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td>{getPriorityBadge(task.priority)}</td>
                    <td>
                      <div className="progress-bar-sm">
                        <div className="progress-fill" style={{ width: `${task.progress}%`, backgroundColor: task.color }}></div>
                      </div>
                      <span className="progress-text">{task.progress}%</span>
                    </td>
                    <td>{new Date(task.start).toLocaleDateString()}</td>
                    <td>{new Date(task.end).toLocaleDateString()}</td>
                    <td>{task.estimatedHours || '-'}</td>
                    <td>{task.actualHours || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => handleDoubleClick({ id: task.id })} title="Edit">✏️</button>
                        <button onClick={() => { setTimeLogTask(task); setShowTimeLogModal(true); }} title="Log Time">⏱️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dashboard View */}
        {currentView === 'dashboard' && dashboard && (
          <div className="dashboard-view">
            <div className="dashboard-grid">
              {/* Stats Cards */}
              <div className="dashboard-section stats-cards">
                <div className="stat-card">
                  <div className="stat-value">{stats?.total || 0}</div>
                  <div className="stat-label">Total Tasks</div>
                </div>
                <div className="stat-card highlight">
                  <div className="stat-value">{stats?.completionRate || 0}%</div>
                  <div className="stat-label">Completion Rate</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats?.velocity || 0}</div>
                  <div className="stat-label">Completed This Week</div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-value">{stats?.overdue || 0}</div>
                  <div className="stat-label">Overdue</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats?.dueToday || 0}</div>
                  <div className="stat-label">Due Today</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats?.totalActualHours || 0}h</div>
                  <div className="stat-label">Hours Logged</div>
                </div>
              </div>

              {/* Category Progress */}
              <div className="dashboard-section">
                <h3>Progress by Category</h3>
                <div className="category-progress">
                  {Object.entries(dashboard.categoryProgress || {}).map(([cat, data]) => (
                    <div key={cat} className="category-row">
                      <span className="category-name">{getCategoryIcon(cat)} {cat}</span>
                      <div className="category-bar">
                        <div className="category-fill" style={{ width: `${data.avgProgress}%` }}></div>
                      </div>
                      <span className="category-stats">{data.completed}/{data.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="dashboard-section">
                <h3>Upcoming Deadlines</h3>
                <div className="deadline-list">
                  {(dashboard.upcoming || []).map(task => (
                    <div key={task.id} className="deadline-item" onClick={() => handleDoubleClick({ id: task.id })}>
                      <div className="deadline-color" style={{ backgroundColor: task.color }}></div>
                      <div className="deadline-info">
                        <span className="deadline-name">{task.name}</span>
                        <span className="deadline-date">{new Date(task.end).toLocaleDateString()}</span>
                      </div>
                      {getPriorityBadge(task.priority)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Overdue Tasks */}
              {(dashboard.overdue || []).length > 0 && (
                <div className="dashboard-section overdue-section">
                  <h3>⚠️ Overdue Tasks</h3>
                  <div className="overdue-list">
                    {dashboard.overdue.map(task => (
                      <div key={task.id} className="overdue-item" onClick={() => handleDoubleClick({ id: task.id })}>
                        <span className="overdue-name">{task.name}</span>
                        <span className="overdue-date">Due: {new Date(task.end).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="dashboard-section">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {(dashboard.recentActivity || []).map(act => (
                    <div key={act.id} className="activity-item">
                      <span className="activity-action">{act.action}</span>
                      <span className="activity-task">{act.taskName}</span>
                      <span className="activity-time">{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="dashboard-section">
                <h3>🤖 AI Insights</h3>
                <div className="insights-list">
                  {(dashboard.suggestions || []).map((s, i) => (
                    <div key={i} className={`insight-item ${s.type}`}>
                      <span className="insight-title">{s.title}</span>
                      <span className="insight-message">{s.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar */}
      {showSidebar && currentView !== 'dashboard' && (
        <div className="task-list-panel">
          <div className="panel-header">
            <h3>Tasks ({filteredTasks.length})</h3>
            <button className="close-panel" onClick={() => setShowSidebar(false)}>×</button>
          </div>
          <div className="task-list">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`task-item ${task.type === 'milestone' ? 'milestone' : ''}`}
                onClick={() => handleDoubleClick({ id: task.id })}
              >
                <div className="task-color" style={{ backgroundColor: task.color }}></div>
                <div className="task-info">
                  <div className="task-header">
                    <span className="task-name">{getCategoryIcon(task.category)} {task.name}</span>
                  </div>
                  <div className="task-meta">
                    {getStatusBadge(task.status)}
                    {getPriorityBadge(task.priority)}
                  </div>
                </div>
                <div className="task-actions">
                  <div className="task-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${task.progress}%`, backgroundColor: task.color }}></div>
                    </div>
                  </div>
                  <div className="quick-actions">
                    <button className="quick-btn" onClick={(e) => { e.stopPropagation(); setShowDependencyMode(true); setDependencySource(task); }} title="Link">🔗</button>
                    <button className="quick-btn" onClick={(e) => { e.stopPropagation(); setTimeLogTask(task); setShowTimeLogModal(true); }} title="Log Time">⏱️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : formData.type === 'milestone' ? 'New Milestone' : 'New Task'}</h2>
              <button className="close-modal" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Task name" autoFocus />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    <option value="task">Task</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
                <button className="ai-classify-btn" onClick={handleAiClassify} title="AI Classify">🤖 Auto</button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start</label>
                  <input type="date" value={formData.start} onChange={e => setFormData({ ...formData, start: e.target.value })} />
                </div>
                {formData.type !== 'milestone' && (
                  <div className="form-group">
                    <label>End</label>
                    <input type="date" value={formData.end} onChange={e => setFormData({ ...formData, end: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label>Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assignee</label>
                  <input type="text" value={formData.assignee} onChange={e => setFormData({ ...formData, assignee: e.target.value })} placeholder="Name" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Estimated Hours</label>
                  <input type="number" value={formData.estimatedHours} onChange={e => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) || 0 })} min="0" step="0.5" />
                </div>
                <div className="form-group">
                  <label>Actual Hours</label>
                  <input type="number" value={formData.actualHours} onChange={e => setFormData({ ...formData, actualHours: parseFloat(e.target.value) || 0 })} min="0" step="0.5" />
                </div>
                <div className="form-group">
                  <label>Project</label>
                  <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row scheduling-row">
                <div className="form-group">
                  <label>📅 Schedule (Kanban)</label>
                  <select
                    value={formData.scheduledDate || ''}
                    onChange={e => setFormData({ ...formData, scheduledDate: e.target.value || null })}
                  >
                    <option value="">Later (Backlog)</option>
                    <option value="soon">Soon (Up Next)</option>
                    <option value={new Date().toISOString().split('T')[0]}>Today</option>
                    <option value={new Date(Date.now() + 86400000).toISOString().split('T')[0]}>Tomorrow</option>
                    <option value="custom">Pick a date...</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="auto-schedule-btn"
                  onClick={async () => {
                    const suggested = suggestScheduleDate(formData.estimatedHours || 2);
                    const newFormData = { ...formData, scheduledDate: suggested };
                    setFormData(newFormData);

                    // If editing existing task, save immediately
                    if (editingTask) {
                      try {
                        await fetch(`${API_URL}/tasks/${editingTask.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ scheduledDate: suggested })
                        });
                        showNotification(`Scheduled for ${suggested === 'soon' ? 'Soon' : new Date(suggested + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`, 'success');
                        fetchTasks();
                      } catch (error) {
                        showNotification('Failed to schedule', 'error');
                      }
                    } else {
                      showNotification(`Will schedule for ${suggested === 'soon' ? 'Soon' : new Date(suggested + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`, 'info');
                    }
                  }}
                  title="AI will find the best day based on your capacity"
                >
                  🤖 Auto-Schedule
                </button>
                {formData.scheduledDate === 'custom' && (
                  <div className="form-group">
                    <label>Scheduled Date</label>
                    <input
                      type="date"
                      onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>🔔 Reminder Time</label>
                  <input
                    type="time"
                    value={formData.reminderTime || ''}
                    onChange={e => setFormData({ ...formData, reminderTime: e.target.value, reminderEnabled: !!e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Progress: {formData.progress}%</label>
                <input type="range" min="0" max="100" value={formData.progress} onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) })} />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {COLORS.map(color => (
                    <button key={color} className={`color-btn ${formData.color === color ? 'selected' : ''}`} style={{ backgroundColor: color }} onClick={() => setFormData({ ...formData, color })} />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <input type="text" value={formData.tags.join(', ')} onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })} placeholder="bug, feature, urgent" />
              </div>

              <div className="form-group description-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add notes, details, or subtasks..."
                  rows={8}
                  className="description-textarea"
                />
              </div>
            </div>
            <div className="modal-actions">
              {editingTask && <button className="delete-btn" onClick={handleDeleteTask}>Delete</button>}
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSaveTask}>{editingTask ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && stats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal stats-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Statistics</h2>
              <button className="close-modal" onClick={() => setShowStats(false)}>×</button>
            </div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
              <div className="stat-card highlight"><div className="stat-value">{stats.completionRate}%</div><div className="stat-label">Complete</div></div>
              <div className="stat-card"><div className="stat-value">{stats.avgProgress}%</div><div className="stat-label">Avg Progress</div></div>
              <div className="stat-card warning"><div className="stat-value">{stats.overdue}</div><div className="stat-label">Overdue</div></div>
              <div className="stat-card"><div className="stat-value">{stats.totalEstimatedHours}h</div><div className="stat-label">Estimated</div></div>
              <div className="stat-card"><div className="stat-value">{stats.totalActualHours}h</div><div className="stat-label">Logged</div></div>
            </div>
            <div className="stats-section">
              <h3>By Status</h3>
              <div className="stats-bars">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const s = STATUSES.find(st => st.value === status);
                  return (
                    <div key={status} className="stat-bar-row">
                      <span className="stat-bar-label">{s?.label}</span>
                      <div className="stat-bar-container">
                        <div className="stat-bar-fill" style={{ width: `${(count / stats.total) * 100}%`, backgroundColor: s?.color }}></div>
                      </div>
                      <span className="stat-bar-value">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Log Modal */}
      {showTimeLogModal && timeLogTask && (
        <div className="modal-overlay" onClick={() => setShowTimeLogModal(false)}>
          <div className="modal small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⏱️ Log Time</h2>
              <button className="close-modal" onClick={() => setShowTimeLogModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Task: <strong>{timeLogTask.name}</strong></p>
              <p>Current: {timeLogTask.actualHours || 0}h / {timeLogTask.estimatedHours || 0}h estimated</p>
              <div className="time-buttons">
                {[0.5, 1, 2, 4, 8].map(h => (
                  <button key={h} className="time-btn" onClick={() => handleLogTime(h)}>+{h}h</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Tasks</h2>
              <button className="close-modal" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Select a JSON file to import.</p>
              <input type="file" ref={fileInputRef} accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              <button className="save-btn" onClick={() => fileInputRef.current?.click()}>Choose File</button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Import Modal */}
      {showPasteImport && (
        <div className="modal-overlay" onClick={() => setShowPasteImport(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Paste Import</h2>
              <button className="close-modal" onClick={() => setShowPasteImport(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Paste your reminders from Apple Reminders, Notes, or any list. Tasks are automatically split by commas, dashes (--), or semicolons.
              </p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Buy groceries, Call dentist, Review proposal
Or use dashes: Task 1 -- Task 2 -- Task 3
Or one per line:
- Send invoice
- Schedule meeting"
                rows={8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                autoFocus
              />
              {pasteText && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Preview ({splitTaskIntelligently(pasteText).length} tasks):</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {splitTaskIntelligently(pasteText).slice(0, 20).map((task, i) => (
                      <span key={i} style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-card-hover)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                        {task.length > 30 ? task.substring(0, 30) + '...' : task}
                      </span>
                    ))}
                    {splitTaskIntelligently(pasteText).length > 20 && (
                      <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        +{splitTaskIntelligently(pasteText).length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                💡 Tip: In Apple Reminders, select tasks and press Cmd+C to copy them.
              </p>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => { setShowPasteImport(false); setPasteText(''); }}>Cancel</button>
              <button className="save-btn" onClick={handlePasteImport}>Import {splitTaskIntelligently(pasteText).length} Tasks</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="shortcuts-hint">
          <span>1-5: Views</span>
          <span>Ctrl+N: New</span>
          <span>Ctrl+Z/Y: Undo/Redo</span>
          <span>Ctrl+F: Search</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
