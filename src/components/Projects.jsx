import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Loading from './Loading';
import ErrorMessage from './ErrorMessage';
import ConfirmModal from './ConfirmModal';
import { useToast } from './Toast';
import { getTasks, createTask, updateTask, deleteTask } from '../api';

function Projects() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [editingTask, setEditingTask] = useState(null);

  // Modal & Search / Filter State
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | completed
  const [priorityFilter, setPriorityFilter] = useState('all'); // all | high | medium | low

  const { addToast } = useToast();

  // Fetch tasks on component mount
  const fetchTasksList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to connect to backend server. Make sure port 5000 is running.');
      addToast('Failed to fetch tasks from server.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTasksList();
  }, [fetchTasksList]);

  // Form Reset
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setEditingTask(null);
  };

  // Add Task with Optimistic UI Update (Practical 6 Supplementary 1)
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Task title is required.', 'error');
      return;
    }

    const trimmedTitle = title.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      _id: tempId,
      title: trimmedTitle,
      description: description.trim(),
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };

    // 1. Optimistic Update: Immediately add to state
    setTasks((prev) => [optimisticTask, ...prev]);
    resetForm();
    setSubmitting(true);

    try {
      // 2. Perform backend API write
      const response = await createTask({
        title: trimmedTitle,
        description: optimisticTask.description,
        completed: false,
        priority: optimisticTask.priority,
      });

      const serverTask = response.task || response;

      // 3. Replace optimistic item with persisted MongoDB document
      setTasks((prev) =>
        prev.map((t) => (t._id === tempId ? serverTask : t))
      );
      addToast('Task added and saved to MongoDB!', 'success');
    } catch (err) {
      // 4. Rollback on failure
      setTasks((prev) => prev.filter((t) => t._id !== tempId));
      addToast(err.message || 'Failed to save task to MongoDB.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Start Edit Mode
  const handleStartEdit = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Update Task Submission
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    const previousTasks = [...tasks];
    const updatedId = editingTask._id;
    const updatedPayload = {
      title: title.trim(),
      description: description.trim(),
      priority,
    };

    // Optimistically update list
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedId ? { ...t, ...updatedPayload } : t))
    );
    resetForm();
    setSubmitting(true);

    try {
      const response = await updateTask(updatedId, updatedPayload);
      const savedTask = response.task || response;
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedId ? savedTask : t))
      );
      addToast('Task updated successfully!', 'success');
    } catch (err) {
      setTasks(previousTasks);
      addToast(err.message || 'Failed to update task.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Completion with Optimistic UI
  const handleToggleCompleted = async (task) => {
    const previousTasks = [...tasks];
    const newStatus = !task.completed;

    // Optimistic toggle
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, completed: newStatus } : t))
    );

    try {
      await updateTask(task._id, { completed: newStatus });
      addToast(
        newStatus ? `"${task.title}" marked as completed!` : `"${task.title}" marked as pending.`,
        'success'
      );
    } catch (err) {
      // Revert on error
      setTasks(previousTasks);
      addToast(err.message || 'Failed to sync status change.', 'error');
    }
  };

  // Delete Confirmation Trigger (Practical 6 Supplementary 2)
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const idToDelete = taskToDelete._id;
    const previousTasks = [...tasks];

    // Close modal immediately
    setTaskToDelete(null);

    // Optimistic removal
    setTasks((prev) => prev.filter((t) => t._id !== idToDelete));

    try {
      await deleteTask(idToDelete);
      addToast('Task deleted from MongoDB.', 'info');
    } catch (err) {
      setTasks(previousTasks);
      addToast(err.message || 'Failed to delete task.', 'error');
    }
  };

  // Computed Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const highPriority = tasks.filter((t) => t.priority === 'high' && !t.completed).length;
    return { total, completed, pending, highPriority };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  return (
    <section className="page-section animate-fade-in">
      <div className="section-header">
        <span className="badge badge-primary">Practical 4, 5 & 6: Full Stack CRUD</span>
        <h1 className="section-title">MongoDB Task Manager</h1>
        <p className="section-subtitle">
          Complete end-to-end integration: React 19 Frontend wired to Express.js REST API and MongoDB Mongoose models with optimistic updates.
        </p>
      </div>

      {/* Top Stats Overview Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card stat-completed">
          <div className="stat-icon">✅</div>
          <div>
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card stat-high">
          <div className="stat-icon">🔥</div>
          <div>
            <div className="stat-value">{stats.highPriority}</div>
            <div className="stat-label">High Priority</div>
          </div>
        </div>
      </div>

      {/* Create / Edit Task Form */}
      <div className="card task-form-card">
        <div className="card-header-flex">
          <h2>{editingTask ? '✏️ Edit Task' : '➕ Create New Task'}</h2>
          {editingTask && (
            <button type="button" onClick={resetForm} className="btn-link">
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={editingTask ? handleUpdateTask : handleAddTask}>
          <div className="form-row">
            <div className="input-group flex-2">
              <label htmlFor="task-title">Task Title *</label>
              <input
                id="task-title"
                type="text"
                placeholder="e.g. Design full-stack API architecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div className="input-group flex-1">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="form-control"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              rows="2"
              placeholder="Add optional notes or task criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-actions-flex">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting
                ? 'Processing...'
                : editingTask
                ? '💾 Save Changes'
                : '🚀 Add Task (Optimistic)'}
            </button>
            {editingTask && (
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
            <span className="text-muted form-hint-text">
              ✨ Updates UI instantly, syncs with MongoDB backend.
            </span>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="task-filter-toolbar card">
        <div className="search-box-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control search-input"
          />
        </div>

        <div className="filter-pill-group">
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completed ({stats.completed})
          </button>
        </div>

        <div className="priority-filter-wrap">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-control form-control-sm"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Task List Display */}
      {loading ? (
        <Loading message="Fetching tasks from MongoDB backend..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchTasksList} />
      ) : (
        <div className="task-list-container">
          {filteredTasks.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">📝</div>
              <h3>No tasks found</h3>
              <p className="text-muted">
                {tasks.length === 0
                  ? 'Your database has no tasks yet. Add one using the form above!'
                  : 'No tasks match your current filter or search criteria.'}
              </p>
              {tasks.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="task-grid">
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  className={`task-card ${task.completed ? 'task-done' : ''} ${
                    task._optimistic ? 'task-optimistic' : ''
                  }`}
                >
                  <div className="task-card-header">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleCompleted(task)}
                      />
                      <span className="checkbox-custom"></span>
                    </label>

                    <div className="task-title-wrap">
                      <h3 className={`task-title ${task.completed ? 'title-done' : ''}`}>
                        {task.title}
                      </h3>
                      {task._optimistic && (
                        <span className="badge-pulse">Saving to MongoDB...</span>
                      )}
                    </div>

                    <span className={`priority-tag priority-${task.priority}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>

                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}

                  <div className="task-meta-footer">
                    <span className="task-date">
                      🕒 {task.createdAt ? new Date(task.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}
                    </span>

                    <div className="task-action-btns">
                      <button
                        type="button"
                        className="btn-action btn-edit"
                        onClick={() => handleStartEdit(task)}
                        title="Edit task"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        className="btn-action btn-delete"
                        onClick={() => setTaskToDelete(task)}
                        title="Delete task with confirmation dialog"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog Modal (Practical 6 Supplementary 2) */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        title="Delete Task Confirmation"
        message={`Are you sure you want to permanently delete "${taskToDelete?.title}"? This will remove the document from your MongoDB Atlas database.`}
        confirmText="Confirm Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </section>
  );
}

export default Projects;
