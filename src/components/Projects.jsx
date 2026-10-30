import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Loading from './Loading';
import ErrorMessage from './ErrorMessage';
import ConfirmModal from './ConfirmModal';
import TaskModal from './TaskModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import { useToast } from './Toast';
import { getTasks, createTask, updateTask, deleteTask } from '../api';

function Projects({ user: propUser, onLogout, theme, toggleTheme, onUpdateUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active View / Sidebar state
  // views: 'dashboard' | 'all' | 'pending' | 'in_progress' | 'completed'
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Search, Filter, Sort & View Mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | in_progress | completed
  const [priorityFilter, setPriorityFilter] = useState('all'); // all | high | medium | low
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | priority | dueDate | title
  const [viewMode, setViewMode] = useState('board'); // board | cards | table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [profileModalTab, setProfileModalTab] = useState(null); // 'profile' | 'settings' | null

  // Ref for search input keyboard shortcut
  const searchInputRef = useRef(null);

  // User session state
  const currentUser = useMemo(() => {
    if (propUser) return propUser;
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [propUser]);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Sync sidebar view with status filter
  const handleViewChange = (view) => {
    setCurrentView(view);
    setCurrentPage(1);
    setMobileSidebarOpen(false);

    if (view === 'dashboard' || view === 'all') {
      setStatusFilter('all');
    } else if (view === 'pending') {
      setStatusFilter('pending');
    } else if (view === 'in_progress') {
      setStatusFilter('in_progress');
    } else if (view === 'completed') {
      setStatusFilter('completed');
    }
  };

  // Fetch tasks list from backend (GET /tasks with caching)
  const fetchTasksList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.message || 'Unable to connect to backend REST server. Please make sure port 5000 is running.';
      setError(msg);
      addToast('Failed to retrieve tasks from server.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let isMounted = true;
    getTasks()
      .then((data) => {
        if (isMounted) {
          setTasks(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Unable to connect to backend server.');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Open Create Task Modal
  const handleOpenCreateModal = useCallback(() => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }, []);

  // Open Edit Task Modal
  const handleOpenEditModal = useCallback((task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  // Global Keyboard Shortcuts (N for new task, Ctrl+K for search, 1/2/3 for views)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (['input', 'textarea', 'select'].includes(activeTag)) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleOpenCreateModal();
      } else if (e.key === '1') {
        setViewMode('board');
      } else if (e.key === '2') {
        setViewMode('cards');
      } else if (e.key === '3') {
        setViewMode('table');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenCreateModal]);

  // Save Task (Create or Update) with Optimistic UI Update (Practical 6 Supplementary 1)
  const handleSaveTask = async (taskData) => {
    setSubmitting(true);

    if (editingTask) {
      // UPDATE EXISTING TASK
      const previousTasks = [...tasks];
      const updatedId = editingTask._id;
      const optimisticUpdated = {
        ...editingTask,
        ...taskData,
        _optimistic: true,
      };

      // 1. Optimistic UI Update
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedId ? optimisticUpdated : t))
      );
      setIsTaskModalOpen(false);

      try {
        const response = await updateTask(updatedId, taskData);
        const serverTask = response.task || response;

        // 2. Sync with MongoDB document
        setTasks((prev) =>
          prev.map((t) => (t._id === updatedId ? serverTask : t))
        );
        addToast('Task updated successfully!', 'success');
      } catch (err) {
        // 3. Rollback on failure
        setTasks(previousTasks);
        addToast(err.message || 'Failed to update task on server.', 'error');
      } finally {
        setSubmitting(false);
      }
    } else {
      // CREATE NEW TASK
      const tempId = `temp-${Date.now()}`;
      const optimisticTask = {
        _id: tempId,
        ...taskData,
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };

      // 1. Optimistic UI addition
      setTasks((prev) => [optimisticTask, ...prev]);
      setIsTaskModalOpen(false);

      try {
        const response = await createTask(taskData);
        const serverTask = response.task || response;

        // 2. Replace temporary optimistic task with persisted MongoDB doc
        setTasks((prev) =>
          prev.map((t) => (t._id === tempId ? serverTask : t))
        );
        addToast('Task created and saved to MongoDB!', 'success');
      } catch (err) {
        // 3. Rollback on failure
        setTasks((prev) => prev.filter((t) => t._id !== tempId));
        addToast(err.message || 'Failed to save task to MongoDB.', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Toggle Completion / Cycle Status with Optimistic UI
  const handleToggleStatus = async (task) => {
    const previousTasks = [...tasks];
    let nextStatus = 'completed';
    let nextCompleted = true;

    if (task.completed || task.status === 'completed') {
      nextStatus = 'pending';
      nextCompleted = false;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? { ...t, status: nextStatus, completed: nextCompleted }
          : t
      )
    );

    try {
      await updateTask(task._id, { status: nextStatus, completed: nextCompleted });
      addToast(
        nextCompleted
          ? `✓ "${task.title}" marked as completed!`
          : `⏳ "${task.title}" returned to pending.`,
        'success'
      );
    } catch (err) {
      setTasks(previousTasks);
      addToast(err.message || 'Failed to update task status.', 'error');
    }
  };

  // Direct move to specific status (Kanban column actions)
  const handleMoveStatus = async (task, newStatus, e) => {
    if (e) e.stopPropagation();
    const previousTasks = [...tasks];
    const isCompleted = newStatus === 'completed';

    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? { ...t, status: newStatus, completed: isCompleted }
          : t
      )
    );

    try {
      await updateTask(task._id, { status: newStatus, completed: isCompleted });
      addToast(`Moved to ${newStatus.replace('_', ' ').toUpperCase()}`, 'info');
    } catch (err) {
      setTasks(previousTasks);
      addToast(err.message || 'Failed to move task.', 'error');
    }
  };

  // Cycle through Pending -> In Progress -> Completed
  const handleCycleStatus = async (task, e) => {
    e.stopPropagation();
    const previousTasks = [...tasks];
    const statusCycle = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
    };
    const currentStatus = task.status || (task.completed ? 'completed' : 'pending');
    const nextStatus = statusCycle[currentStatus] || 'pending';
    const nextCompleted = nextStatus === 'completed';

    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id
          ? { ...t, status: nextStatus, completed: nextCompleted }
          : t
      )
    );

    try {
      await updateTask(task._id, { status: nextStatus, completed: nextCompleted });
      addToast(`Status: ${nextStatus.replace('_', ' ').toUpperCase()}`, 'info');
    } catch (err) {
      setTasks(previousTasks);
      addToast(err.message || 'Failed to change status.', 'error');
    }
  };

  // Delete Task with Accessible Confirmation Modal (Practical 6 Supplementary 2)
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const idToDelete = taskToDelete._id;
    const taskTitle = taskToDelete.title;
    const previousTasks = [...tasks];

    setTaskToDelete(null);

    // Optimistic removal
    setTasks((prev) => prev.filter((t) => t._id !== idToDelete));

    try {
      await deleteTask(idToDelete);
      addToast(`"${taskTitle}" deleted from database.`, 'info');
    } catch (err) {
      setTasks(previousTasks);
      addToast(err.message || 'Failed to delete task from MongoDB.', 'error');
    }
  };

  // Seed Starter Sample Tasks for quick demonstration
  const handleSeedSampleTasks = async () => {
    setSubmitting(true);
    const sampleItems = [
      {
        title: 'Optimize REST API In-Memory Caching (NodeCache)',
        description: 'Implement 60-second TTL caching on GET /tasks endpoint with mutation invalidation (Practical 9).',
        priority: 'high',
        status: 'completed',
        completed: true,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        title: 'Implement JWT Token Session & User Isolation',
        description: 'Verify HMAC SHA-256 tokens and isolate user-specific task storage securely (Practical 7).',
        priority: 'high',
        status: 'in_progress',
        completed: false,
        dueDate: new Date(Date.now() + 172800000).toISOString(),
      },
      {
        title: 'Design Modern SaaS Dashboard UI & Micro-interactions',
        description: 'Construct responsive sidebar, statistics cards, table/card switch, and dark/light themes.',
        priority: 'medium',
        status: 'pending',
        completed: false,
        dueDate: new Date(Date.now() + 259200000).toISOString(),
      },
      {
        title: 'Refactor Mongoose Schema with Validation & Hooks',
        description: 'Add pre-save hook trimming title whitespace and synchronizing completion status (Practical 5).',
        priority: 'low',
        status: 'completed',
        completed: true,
        dueDate: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        title: 'Integrate GitHub REST API Explorer with Error Boundary',
        description: 'Build asynchronous data fetcher with animated loading spinner and error retry trigger (Practical 3).',
        priority: 'medium',
        status: 'in_progress',
        completed: false,
        dueDate: new Date(Date.now() + 345600000).toISOString(),
      },
    ];

    try {
      for (const item of sampleItems) {
        await createTask(item);
      }
      addToast('Sample starter tasks added successfully!', 'success');
      await fetchTasksList();
    } catch (err) {
      addToast(err.message || 'Failed to seed sample tasks.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Tasks to CSV
  const handleExportCSV = () => {
    if (tasks.length === 0) {
      addToast('No tasks available to export.', 'info');
      return;
    }

    const headers = ['ID', 'Title', 'Description', 'Status', 'Completed', 'Priority', 'Due Date', 'Created At'];
    const rows = tasks.map((t) => [
      `"${t._id || ''}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.status || (t.completed ? 'completed' : 'pending')}"`,
      `"${t.completed ? 'true' : 'false'}"`,
      `"${t.priority || 'medium'}"`,
      `"${t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''}"`,
      `"${t.createdAt ? new Date(t.createdAt).toISOString() : ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `tasks_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Tasks exported to CSV successfully!', 'success');
  };

  // Dashboard Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed || t.status === 'completed').length;
    const inProgress = tasks.filter((t) => !t.completed && t.status === 'in_progress').length;
    const pending = total - completed - inProgress;
    const highPriority = tasks.filter((t) => t.priority === 'high' && !t.completed && t.status !== 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, pending, highPriority, completionRate };
  }, [tasks]);

  // Filtered & Sorted Tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      const taskStatus = task.status || (task.completed ? 'completed' : 'pending');

      // Status Filter
      if (statusFilter === 'pending' && taskStatus !== 'pending') return false;
      if (statusFilter === 'in_progress' && taskStatus !== 'in_progress') return false;
      if (statusFilter === 'completed' && taskStatus !== 'completed') return false;

      // Priority Filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = (task.title || '').toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return result;
  }, [tasks, statusFilter, priorityFilter, searchQuery, sortBy]);

  // Kanban Columns Data
  const kanbanColumns = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filterFn = (task) => {
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (query) {
        const matchesTitle = (task.title || '').toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    };

    return {
      pending: tasks.filter((t) => (t.status === 'pending' || (!t.status && !t.completed)) && filterFn(t)),
      in_progress: tasks.filter((t) => t.status === 'in_progress' && !t.completed && filterFn(t)),
      completed: tasks.filter((t) => (t.status === 'completed' || t.completed) && filterFn(t)),
    };
  }, [tasks, searchQuery, priorityFilter]);

  // Paginated Sliced Tasks for Cards & Table views
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTasks.length / pageSize));
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedTasks.slice(start, start + pageSize);
  }, [filteredAndSortedTasks, currentPage, pageSize]);

  // Formatted Current Date for Header
  const formattedToday = useMemo(() => {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return new Date().toLocaleDateString(undefined, options);
  }, []);

  const handleUserLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    addToast('Logged out successfully.', 'info');
    navigate('/login');
  };

  const handleUpdateUserCallback = (updated) => {
    if (onUpdateUser) onUpdateUser(updated);
  };

  // Helper for Due Date status badge
  const renderDueDateBadge = (dueDate, completed) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateClean = new Date(due);
    dueDateClean.setHours(0, 0, 0, 0);

    const isOverdue = dueDateClean < today && !completed;
    const isToday = dueDateClean.getTime() === today.getTime();

    return (
      <span
        className={`task-due-tag ${
          isOverdue ? 'due-overdue animate-pulse-glow' : isToday ? 'due-today' : 'due-future'
        }`}
        title={`Due: ${due.toLocaleDateString()}`}
      >
        📅 {isOverdue ? '⚠️ Overdue: ' : isToday ? '🔥 Due Today: ' : 'Due: '}
        {due.toLocaleDateString([], { month: 'short', day: 'numeric' })}
      </span>
    );
  };

  return (
    <div className="saas-app-container">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}

      {/* 1. PROFESSIONAL SAAS SIDEBAR */}
      <aside className={`saas-sidebar ${mobileSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-icon">TF</div>
          <div className="brand-titles">
            <div className="brand-badge-row">
              <span className="brand-main-title">TaskFlow Pro</span>
              <span className="saas-version-tag">SaaS</span>
            </div>
            <span className="brand-sub-title">ITUE301 • Siddharth Bhatti</span>
          </div>
          <button
            type="button"
            className="sidebar-close-mobile"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar Navigation">
          <div className="sidebar-section-title">WORKSPACES</div>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleViewChange('dashboard')}
          >
            <span className="sidebar-item-icon">📊</span>
            <span className="sidebar-item-text">Dashboard</span>
            <span className="sidebar-counter-pill">{stats.total}</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'all' ? 'active' : ''}`}
            onClick={() => handleViewChange('all')}
          >
            <span className="sidebar-item-icon">📋</span>
            <span className="sidebar-item-text">My Tasks</span>
            <span className="sidebar-counter-pill">{stats.total}</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'pending' ? 'active' : ''}`}
            onClick={() => handleViewChange('pending')}
          >
            <span className="sidebar-item-icon">⏳</span>
            <span className="sidebar-item-text">To Do / Pending</span>
            {stats.pending > 0 && (
              <span className="sidebar-counter-pill pill-amber">{stats.pending}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'in_progress' ? 'active' : ''}`}
            onClick={() => handleViewChange('in_progress')}
          >
            <span className="sidebar-item-icon">🔄</span>
            <span className="sidebar-item-text">In Progress</span>
            {stats.inProgress > 0 && (
              <span className="sidebar-counter-pill pill-blue">{stats.inProgress}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${currentView === 'completed' ? 'active' : ''}`}
            onClick={() => handleViewChange('completed')}
          >
            <span className="sidebar-item-icon">✅</span>
            <span className="sidebar-item-text">Completed</span>
            {stats.completed > 0 && (
              <span className="sidebar-counter-pill pill-green">{stats.completed}</span>
            )}
          </button>

          <div className="sidebar-section-title">PREFERENCES</div>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              setProfileModalTab('profile');
              setMobileSidebarOpen(false);
            }}
          >
            <span className="sidebar-item-icon">👤</span>
            <span className="sidebar-item-text">Profile Overview</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              setProfileModalTab('settings');
              setMobileSidebarOpen(false);
            }}
          >
            <span className="sidebar-item-icon">⚙️</span>
            <span className="sidebar-item-text">Account Settings</span>
          </button>

          <div className="sidebar-section-title">AWDF PRACTICALS</div>

          <Link to="/home" className="sidebar-nav-item" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-item-icon">🎓</span>
            <span className="sidebar-item-text">Practicals & Viva Hub</span>
          </Link>

          <Link to="/projects" className="sidebar-nav-item" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-item-icon">🐙</span>
            <span className="sidebar-item-text">GitHub REST API (Pr-3)</span>
          </Link>

          <Link to="/contact" className="sidebar-nav-item" onClick={() => setMobileSidebarOpen(false)}>
            <span className="sidebar-item-icon">📬</span>
            <span className="sidebar-item-text">Contact Form (Pr-2)</span>
          </Link>
        </nav>

        {/* Sidebar Keyboard Shortcuts Helper */}
        <div className="sidebar-shortcuts-box">
          <span className="shortcuts-title">⚡ SHORTCUTS</span>
          <div className="shortcut-row">
            <code>N</code> <span>New Task</span>
          </div>
          <div className="shortcut-row">
            <code>Ctrl+K</code> <span>Search</span>
          </div>
          <div className="shortcut-row">
            <code>1 / 2 / 3</code> <span>Views</span>
          </div>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="sidebar-footer">
          {currentUser ? (
            <div className="sidebar-user-card">
              <div
                className="user-avatar-circle"
                onClick={() => setProfileModalTab('profile')}
                title="View Profile"
              >
                {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'TF'}
              </div>
              <div className="user-meta-text" onClick={() => setProfileModalTab('profile')}>
                <span className="user-display-name">{currentUser.name || 'User'}</span>
                <span className="user-email-text">{currentUser.email || 'student@charusat.edu.in'}</span>
              </div>
              <button
                type="button"
                className="sidebar-logout-btn"
                onClick={handleUserLogout}
                title="Sign out of account"
                aria-label="Logout"
              >
                🚪
              </button>
            </div>
          ) : (
            <div className="sidebar-guest-card">
              <p className="guest-prompt-text">Sign in for private storage</p>
              <Link to="/login" className="btn btn-primary btn-sm btn-block">
                Sign In / Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div className="saas-main-viewport">
        {/* DASHBOARD HEADER */}
        <header className="dashboard-header">
          <div className="header-left-flex">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Toggle mobile navigation menu"
            >
              ☰
            </button>
            <div className="header-welcome-block">
              <h1 className="header-welcome-title">
                {currentUser
                  ? `Welcome back, ${currentUser.name.split(' ')[0]} 👋`
                  : 'Welcome to Task Manager 👋'}
              </h1>
              <span className="header-date-pill">🗓️ {formattedToday}</span>
            </div>
          </div>

          {/* Header Global Search Bar with Ctrl+K shortcut */}
          <div className="header-search-wrap">
            <span className="header-search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks... (Press Ctrl+K)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="header-search-input"
              aria-label="Search tasks"
            />
            {searchQuery ? (
              <button
                type="button"
                className="header-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : (
              <span className="kbd-shortcut-hint">Ctrl K</span>
            )}
          </div>

          {/* Header Right Actions */}
          <div className="header-right-actions">
            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              className="theme-switch-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Quick Profile Menu */}
            {currentUser && (
              <button
                type="button"
                className="header-avatar-btn"
                onClick={() => setProfileModalTab('profile')}
                title="Account Profile"
              >
                <span>{currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'TF'}</span>
              </button>
            )}

            {/* Prominent "Add New Task" CTA */}
            <button
              type="button"
              className="btn btn-primary btn-add-task-cta glow-btn"
              onClick={handleOpenCreateModal}
            >
              <span className="btn-icon">➕</span>
              <span className="btn-text">New Task</span>
              <span className="kbd-key-small">N</span>
            </button>
          </div>
        </header>

        {/* DASHBOARD BODY */}
        <div className="dashboard-content-container animate-fade-in">
          {/* Practical Milestone Header Tag */}
          <div className="practical-context-banner">
            <div className="banner-badge-group">
              <span className="badge badge-primary">⚡ Practical 4, 5, 6: Full Stack CRUD</span>
              <span className="badge badge-accent">🔐 Practical 7: JWT Auth & Multi-User</span>
              <span className="badge badge-cache">⚡ Practical 9: NodeCache 60s TTL</span>
            </div>
            <p className="banner-desc">
              Connected live to Express 5 REST API (port 5000) & MongoDB Atlas with in-memory caching and user-isolated workspaces.
            </p>
          </div>

          {/* 3. DASHBOARD STATISTICS CARDS & VELOCITY OVERVIEW */}
          <section className="stats-dashboard-grid" aria-label="Task statistics">
            {/* Total Tasks Card */}
            <div className="stat-saas-card stat-total" onClick={() => handleViewChange('all')}>
              <div className="stat-saas-header">
                <span className="stat-saas-label">Total Tasks</span>
                <span className="stat-saas-icon">📋</span>
              </div>
              <div className="stat-saas-body">
                <span className="stat-saas-number">{stats.total}</span>
                <span className="stat-saas-trend">In database</span>
              </div>
              <div className="stat-progress-bar-bg">
                <div
                  className="stat-progress-bar-fill fill-primary"
                  style={{ width: `${stats.total > 0 ? 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Pending Tasks Card */}
            <div className="stat-saas-card stat-pending" onClick={() => handleViewChange('pending')}>
              <div className="stat-saas-header">
                <span className="stat-saas-label">To Do / Pending</span>
                <span className="stat-saas-icon">⏳</span>
              </div>
              <div className="stat-saas-body">
                <span className="stat-saas-number">{stats.pending}</span>
                <span className="stat-saas-trend">
                  {stats.total > 0 ? `${Math.round((stats.pending / stats.total) * 100)}% of total` : 'None'}
                </span>
              </div>
              <div className="stat-progress-bar-bg">
                <div
                  className="stat-progress-bar-fill fill-amber"
                  style={{
                    width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* In Progress Tasks Card */}
            <div className="stat-saas-card stat-inprogress" onClick={() => handleViewChange('in_progress')}>
              <div className="stat-saas-header">
                <span className="stat-saas-label">In Progress</span>
                <span className="stat-saas-icon">🔄</span>
              </div>
              <div className="stat-saas-body">
                <span className="stat-saas-number">{stats.inProgress}</span>
                <span className="stat-saas-trend">
                  {stats.total > 0 ? `${Math.round((stats.inProgress / stats.total) * 100)}% active` : 'None'}
                </span>
              </div>
              <div className="stat-progress-bar-bg">
                <div
                  className="stat-progress-bar-fill fill-blue"
                  style={{
                    width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Completed Tasks Card */}
            <div className="stat-saas-card stat-completed" onClick={() => handleViewChange('completed')}>
              <div className="stat-saas-header">
                <span className="stat-saas-label">Completed</span>
                <span className="stat-saas-icon">✅</span>
              </div>
              <div className="stat-saas-body">
                <span className="stat-saas-number">{stats.completed}</span>
                <span className="stat-saas-trend">
                  {stats.completionRate}% completion rate
                </span>
              </div>
              <div className="stat-progress-bar-bg">
                <div
                  className="stat-progress-bar-fill fill-green"
                  style={{ width: `${stats.completionRate}%` }}
                ></div>
              </div>
            </div>
          </section>

          {/* Interactive Progress & Velocity Visualizer Card */}
          {stats.total > 0 && (
            <div className="progress-overview-card card">
              <div className="progress-card-inner-flex">
                <div className="radial-progress-box">
                  <svg viewBox="0 0 100 100" className="radial-svg" aria-label={`${stats.completionRate}% completed`}>
                    <circle className="radial-bg-track" cx="50" cy="50" r="38" />
                    <circle
                      className="radial-progress-fill"
                      cx="50"
                      cy="50"
                      r="38"
                      strokeDasharray="238.76"
                      strokeDashoffset={238.76 - (238.76 * stats.completionRate) / 100}
                    />
                  </svg>
                  <div className="radial-text-content">
                    <span className="radial-num">{stats.completionRate}%</span>
                    <span className="radial-label">Velocity</span>
                  </div>
                </div>

                <div className="progress-details-content">
                  <div className="progress-overview-header">
                    <div>
                      <h3 className="progress-card-title">Overall Task Velocity & Completion</h3>
                      <p className="text-muted progress-card-desc">
                        Real-time status breakdown across all documents stored in MongoDB Atlas.
                      </p>
                    </div>
                    <div className="progress-rate-badge">
                      <span>✓ {stats.completed} of {stats.total} Finished</span>
                    </div>
                  </div>

                  <div className="multi-status-progress-track">
                    <div
                      className="multi-progress-segment seg-completed"
                      style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      title={`Completed: ${stats.completed}`}
                    ></div>
                    <div
                      className="multi-progress-segment seg-inprogress"
                      style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                      title={`In Progress: ${stats.inProgress}`}
                    ></div>
                    <div
                      className="multi-progress-segment seg-pending"
                      style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                      title={`Pending: ${stats.pending}`}
                    ></div>
                  </div>

                  <div className="progress-legend-row">
                    <div className="legend-item">
                      <span className="legend-dot dot-green"></span>
                      <span>Completed ({stats.completed})</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-blue"></span>
                      <span>In Progress ({stats.inProgress})</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-amber"></span>
                      <span>Pending ({stats.pending})</span>
                    </div>
                    {stats.highPriority > 0 && (
                      <div className="legend-item legend-alert">
                        <span className="legend-dot dot-red"></span>
                        <span>🔥 {stats.highPriority} High Priority Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. TASK MANAGEMENT SECTION: TOOLBAR & CONTROLS */}
          <div className="task-toolbar-card card">
            <div className="toolbar-top-row">
              {/* Status Filter Tabs */}
              <div className="filter-pill-nav" role="tablist">
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                >
                  All ({stats.total})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter('pending');
                    setCurrentPage(1);
                  }}
                >
                  ⏳ Pending ({stats.pending})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter('in_progress');
                    setCurrentPage(1);
                  }}
                >
                  🔄 In Progress ({stats.inProgress})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter('completed');
                    setCurrentPage(1);
                  }}
                >
                  ✅ Completed ({stats.completed})
                </button>
              </div>

              {/* View Mode Toggle (Board / Cards / Table) & CSV Export */}
              <div className="toolbar-right-controls">
                <div className="view-toggle-btn-group" role="group" aria-label="View layout switch">
                  <button
                    type="button"
                    className={`btn-view-toggle ${viewMode === 'board' ? 'active' : ''}`}
                    onClick={() => setViewMode('board')}
                    title="Kanban Board View (Press '1')"
                    aria-label="Board view"
                  >
                    📊 Board
                  </button>
                  <button
                    type="button"
                    className={`btn-view-toggle ${viewMode === 'cards' ? 'active' : ''}`}
                    onClick={() => setViewMode('cards')}
                    title="Grid Cards View (Press '2')"
                    aria-label="Cards view"
                  >
                    🪟 Cards
                  </button>
                  <button
                    type="button"
                    className={`btn-view-toggle ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Data Table View (Press '3')"
                    aria-label="Table view"
                  >
                    📑 Table
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-export"
                  onClick={handleExportCSV}
                  title="Export tasks as CSV spreadsheet"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Filter & Sort Controls Row */}
            <div className="toolbar-bottom-row">
              {/* Priority Select */}
              <div className="select-control-wrap">
                <label htmlFor="filter-priority">Priority:</label>
                <select
                  id="filter-priority"
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control form-control-sm select-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>
              </div>

              {/* Sort By Select */}
              <div className="select-control-wrap">
                <label htmlFor="sort-tasks">Sort By:</label>
                <select
                  id="sort-tasks"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control form-control-sm select-sm"
                >
                  <option value="newest">🕒 Newest First</option>
                  <option value="oldest">⏳ Oldest First</option>
                  <option value="priority">🔥 Priority (High to Low)</option>
                  <option value="dueDate">📅 Due Date (Soonest)</option>
                  <option value="title">🔤 Title (A to Z)</option>
                </select>
              </div>

              {/* Results Count & Reset Filters */}
              <div className="filter-summary-meta">
                <span>
                  Showing <strong>{filteredAndSortedTasks.length}</strong> of <strong>{tasks.length}</strong> tasks
                </span>
                {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery.trim()) && (
                  <button
                    type="button"
                    className="btn-link btn-clear-filters"
                    onClick={() => {
                      setStatusFilter('all');
                      setPriorityFilter('all');
                      setSearchQuery('');
                      setCurrentView('all');
                      setCurrentPage(1);
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TASK DISPLAY (KANBAN BOARD / CARDS GRID / DATA TABLE) */}
          {loading ? (
            <div className="loading-state-wrapper">
              <Loading message="Fetching tasks from MongoDB Atlas backend..." />
              <div className="skeleton-cards-grid">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton-task-card">
                    <div className="skeleton-line skeleton-title"></div>
                    <div className="skeleton-line skeleton-desc"></div>
                    <div className="skeleton-line skeleton-meta"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchTasksList} />
          ) : filteredAndSortedTasks.length === 0 ? (
            <div className="empty-state-card card animate-scale-in">
              <div className="empty-state-icon">📋</div>
              <h3>
                {tasks.length === 0
                  ? 'Your MongoDB database is currently empty'
                  : 'No tasks match your criteria'}
              </h3>
              <p className="text-muted">
                {tasks.length === 0
                  ? 'Add your first task using the button below, or quickly seed realistic sample items.'
                  : 'Try adjusting your search terms, changing priority filters, or resetting filter options.'}
              </p>
              <div className="empty-actions-flex">
                <button
                  type="button"
                  className="btn btn-primary glow-btn"
                  onClick={handleOpenCreateModal}
                >
                  ➕ Create New Task
                </button>
                {tasks.length === 0 ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSeedSampleTasks}
                    disabled={submitting}
                  >
                    ✨ Seed Starter Sample Tasks
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setStatusFilter('all');
                      setPriorityFilter('all');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'board' ? (
            /* =========================================================
               --- KANBAN BOARD VIEW ---
               ========================================================= */
            <div className="kanban-board-container">
              {/* Column 1: To Do / Pending */}
              <div className="kanban-column col-pending">
                <div className="kanban-col-header">
                  <div className="kanban-col-title-wrap">
                    <span className="kanban-status-dot dot-amber"></span>
                    <h3 className="kanban-col-title">To Do</h3>
                    <span className="kanban-col-count">{kanbanColumns.pending.length}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-add-kanban-item"
                    onClick={handleOpenCreateModal}
                    title="Quick add task"
                  >
                    +
                  </button>
                </div>

                <div className="kanban-cards-list">
                  {kanbanColumns.pending.length === 0 ? (
                    <div className="kanban-empty-drop">
                      <span>No pending tasks</span>
                    </div>
                  ) : (
                    kanbanColumns.pending.map((task) => (
                      <div
                        key={task._id}
                        className={`kanban-card ${task._optimistic ? 'task-optimistic-sync' : ''}`}
                      >
                        <div className="kanban-card-top">
                          <span className={`badge-priority priority-${task.priority || 'medium'}`}>
                            {(task.priority || 'medium').toUpperCase()}
                          </span>
                          {renderDueDateBadge(task.dueDate, false)}
                        </div>

                        <h4 className="kanban-card-title">{task.title}</h4>

                        {task.description && (
                          <p className="kanban-card-desc">{task.description}</p>
                        )}

                        <div className="kanban-card-footer">
                          <button
                            type="button"
                            className="btn-kanban-advance"
                            onClick={(e) => handleMoveStatus(task, 'in_progress', e)}
                            title="Move to In Progress"
                          >
                            Start ➔
                          </button>

                          <div className="kanban-card-actions">
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => handleOpenEditModal(task)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action btn-action-delete"
                              onClick={() => setTaskToDelete(task)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: In Progress */}
              <div className="kanban-column col-inprogress">
                <div className="kanban-col-header">
                  <div className="kanban-col-title-wrap">
                    <span className="kanban-status-dot dot-blue"></span>
                    <h3 className="kanban-col-title">In Progress</h3>
                    <span className="kanban-col-count">{kanbanColumns.in_progress.length}</span>
                  </div>
                </div>

                <div className="kanban-cards-list">
                  {kanbanColumns.in_progress.length === 0 ? (
                    <div className="kanban-empty-drop">
                      <span>No active tasks</span>
                    </div>
                  ) : (
                    kanbanColumns.in_progress.map((task) => (
                      <div
                        key={task._id}
                        className={`kanban-card card-active-inprogress ${
                          task._optimistic ? 'task-optimistic-sync' : ''
                        }`}
                      >
                        <div className="kanban-card-top">
                          <span className={`badge-priority priority-${task.priority || 'medium'}`}>
                            {(task.priority || 'medium').toUpperCase()}
                          </span>
                          {renderDueDateBadge(task.dueDate, false)}
                        </div>

                        <h4 className="kanban-card-title">{task.title}</h4>

                        {task.description && (
                          <p className="kanban-card-desc">{task.description}</p>
                        )}

                        <div className="kanban-card-footer">
                          <div className="kanban-advance-group">
                            <button
                              type="button"
                              className="btn-kanban-step"
                              onClick={(e) => handleMoveStatus(task, 'pending', e)}
                              title="Move back to To Do"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              className="btn-kanban-advance btn-advance-done"
                              onClick={(e) => handleMoveStatus(task, 'completed', e)}
                              title="Mark as Completed"
                            >
                              Done ✓
                            </button>
                          </div>

                          <div className="kanban-card-actions">
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => handleOpenEditModal(task)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action btn-action-delete"
                              onClick={() => setTaskToDelete(task)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Completed */}
              <div className="kanban-column col-completed">
                <div className="kanban-col-header">
                  <div className="kanban-col-title-wrap">
                    <span className="kanban-status-dot dot-green"></span>
                    <h3 className="kanban-col-title">Completed</h3>
                    <span className="kanban-col-count">{kanbanColumns.completed.length}</span>
                  </div>
                </div>

                <div className="kanban-cards-list">
                  {kanbanColumns.completed.length === 0 ? (
                    <div className="kanban-empty-drop">
                      <span>No completed tasks</span>
                    </div>
                  ) : (
                    kanbanColumns.completed.map((task) => (
                      <div
                        key={task._id}
                        className={`kanban-card card-completed ${
                          task._optimistic ? 'task-optimistic-sync' : ''
                        }`}
                      >
                        <div className="kanban-card-top">
                          <span className={`badge-priority priority-${task.priority || 'medium'}`}>
                            {(task.priority || 'medium').toUpperCase()}
                          </span>
                          <span className="task-done-check-pill">✓ Done</span>
                        </div>

                        <h4 className="kanban-card-title title-struck">{task.title}</h4>

                        {task.description && (
                          <p className="kanban-card-desc">{task.description}</p>
                        )}

                        <div className="kanban-card-footer">
                          <button
                            type="button"
                            className="btn-kanban-reopen"
                            onClick={(e) => handleMoveStatus(task, 'pending', e)}
                            title="Reopen task"
                          >
                            ↩ Reopen
                          </button>

                          <div className="kanban-card-actions">
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => handleOpenEditModal(task)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action btn-action-delete"
                              onClick={() => setTaskToDelete(task)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* =========================================================
               --- GRID CARDS VIEW ---
               ========================================================= */
            <div className="tasks-cards-grid">
              {paginatedTasks.map((task) => {
                const isCompleted = task.completed || task.status === 'completed';
                const taskStatus = task.status || (isCompleted ? 'completed' : 'pending');

                return (
                  <div
                    key={task._id}
                    className={`saas-task-card ${isCompleted ? 'task-done' : ''} ${
                      task._optimistic ? 'task-optimistic-sync' : ''
                    }`}
                  >
                    {/* Top Row: Status Checkbox, Title & Priority Badge */}
                    <div className="saas-card-top">
                      <label
                        className="custom-checkbox-wrap"
                        title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => handleToggleStatus(task)}
                        />
                        <span className="custom-check-box"></span>
                      </label>

                      <div className="task-title-content">
                        <h3 className={`saas-card-title ${isCompleted ? 'title-struck' : ''}`}>
                          {task.title}
                        </h3>
                        {task._optimistic && (
                          <span className="badge-syncing-optimistic">
                            Saving to MongoDB...
                          </span>
                        )}
                      </div>

                      <span className={`badge-priority priority-${task.priority || 'medium'}`}>
                        {(task.priority || 'medium').toUpperCase()}
                      </span>
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="saas-card-description">{task.description}</p>
                    )}

                    {/* Status Pill & Due Date Tag */}
                    <div className="saas-card-tags-row">
                      <button
                        type="button"
                        className={`status-cycle-pill status-${taskStatus}`}
                        onClick={(e) => handleCycleStatus(task, e)}
                        title="Click to cycle: Pending → In Progress → Completed"
                      >
                        <span className="status-dot-indicator"></span>
                        <span className="status-label-text">
                          {taskStatus === 'in_progress'
                            ? 'In Progress'
                            : taskStatus === 'completed'
                            ? 'Completed'
                            : 'Pending'}
                        </span>
                        <span className="status-cycle-hint">↻</span>
                      </button>

                      {renderDueDateBadge(task.dueDate, isCompleted)}
                    </div>

                    {/* Card Footer: Timestamp & Actions */}
                    <div className="saas-card-footer">
                      <span className="card-timestamp">
                        🕒{' '}
                        {task.createdAt
                          ? new Date(task.createdAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Just now'}
                      </span>

                      <div className="card-action-btns">
                        <button
                          type="button"
                          className="btn-icon-action btn-action-edit"
                          onClick={() => handleOpenEditModal(task)}
                          title="Edit task details"
                          aria-label={`Edit ${task.title}`}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-icon-action btn-action-delete"
                          onClick={() => setTaskToDelete(task)}
                          title="Delete task with confirmation"
                          aria-label={`Delete ${task.title}`}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =========================================================
               --- DATA TABLE VIEW ---
               ========================================================= */
            <div className="saas-table-card card">
              <div className="table-responsive-wrapper">
                <table className="saas-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px' }}>Done</th>
                      <th>Task Title & Details</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task) => {
                      const isCompleted = task.completed || task.status === 'completed';
                      const taskStatus = task.status || (isCompleted ? 'completed' : 'pending');

                      return (
                        <tr
                          key={task._id}
                          className={`${isCompleted ? 'row-done' : ''} ${
                            task._optimistic ? 'row-optimistic' : ''
                          }`}
                        >
                          <td>
                            <label className="custom-checkbox-wrap">
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => handleToggleStatus(task)}
                              />
                              <span className="custom-check-box"></span>
                            </label>
                          </td>
                          <td>
                            <div className="table-task-cell">
                              <span className={`table-title ${isCompleted ? 'title-struck' : ''}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="table-description-text">
                                  {task.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge-priority priority-${task.priority || 'medium'}`}>
                              {(task.priority || 'medium').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`status-cycle-pill status-${taskStatus}`}
                              onClick={(e) => handleCycleStatus(task, e)}
                              title="Click to cycle status"
                            >
                              <span className="status-dot-indicator"></span>
                              <span>
                                {taskStatus === 'in_progress'
                                  ? 'In Progress'
                                  : taskStatus === 'completed'
                                  ? 'Completed'
                                  : 'Pending'}
                              </span>
                            </button>
                          </td>
                          <td>
                            {task.dueDate ? (
                              renderDueDateBadge(task.dueDate, isCompleted)
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className="table-date-text">
                              {task.createdAt
                                ? new Date(task.createdAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Just now'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions-flex">
                              <button
                                type="button"
                                className="btn-icon-action btn-action-edit"
                                onClick={() => handleOpenEditModal(task)}
                                title="Edit task"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="btn-icon-action btn-action-delete"
                                onClick={() => setTaskToDelete(task)}
                                title="Delete task"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. PAGINATION BAR (For Cards & Table Views) */}
          {viewMode !== 'board' && filteredAndSortedTasks.length > pageSize && (
            <div className="pagination-wrapper card">
              <div className="pagination-info">
                <span>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                  {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, filteredAndSortedTasks.length)} of{' '}
                  {filteredAndSortedTasks.length} items)
                </span>
              </div>

              <div className="pagination-nav-btns">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>

                <div className="page-number-pills">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`page-num-pill ${num === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. CREATE / EDIT TASK MODAL */}
      <TaskModal
        key={editingTask ? editingTask._id : isTaskModalOpen ? 'open-new' : 'closed'}
        isOpen={isTaskModalOpen}
        task={editingTask}
        onSave={handleSaveTask}
        onClose={() => setIsTaskModalOpen(false)}
        submitting={submitting}
      />

      {/* 7. DELETE CONFIRMATION MODAL (Practical 6 Supplementary 2) */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        title="Delete Task Confirmation"
        message={`Are you sure you want to permanently delete "${taskToDelete?.title}"? This operation will remove the document from MongoDB Atlas and invalidate in-memory cache.`}
        confirmText="Confirm Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />

      {/* 8. PROFILE & SETTINGS MODAL */}
      <ProfileSettingsModal
        key={profileModalTab || 'none'}
        isOpen={Boolean(profileModalTab)}
        user={currentUser}
        initialTab={profileModalTab || 'profile'}
        onClose={() => setProfileModalTab(null)}
        onUserUpdated={handleUpdateUserCallback}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    </div>
  );
}

export default Projects;
