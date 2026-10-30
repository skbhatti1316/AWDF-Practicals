import { useState, useEffect } from 'react';

function TaskModal({ isOpen, task, onSave, onClose, submitting }) {
  const [title, setTitle] = useState(() => task?.title || '');
  const [description, setDescription] = useState(() => task?.description || '');
  const [status, setStatus] = useState(() => task?.status || (task?.completed ? 'completed' : 'pending'));
  const [priority, setPriority] = useState(() => task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(() => {
    if (task?.dueDate) {
      try {
        const d = new Date(task.dueDate);
        return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      } catch {
        return '';
      }
    }
    return '';
  });

  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !aiLoading) onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, aiLoading]);

  if (!isOpen) return null;

  const generateDescription = async () => {
    if (!title.trim()) {
      setError('Enter a task title before generating a description.');
      return;
    }

    setAiLoading(true);
    setAiMessage('Generating a description...');
    setAiError(false);
    setError('');

    try {
      const baseURL = (
        import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
      ).replace(/\/$/, '');

      const response = await fetch(
        `${baseURL}/api/ai/generate-description`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: title.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to generate a description.');
      }

      if (data.description?.trim()) {
        setDescription(data.description.trim());
        setAiMessage(
          data.message ||
            'AI suggestion generated. Review and edit it before saving.'
        );
        setAiError(false);
      } else {
        setAiMessage(
          data.message ||
            'AI is temporarily unavailable. Please write your description manually.'
        );
        setAiError(true);
      }
    } catch (err) {
      console.error('AI description request failed:', err);

      setAiMessage(
        'Could not connect to the AI service. Please check that the backend is running, or write your description manually.'
      );
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      completed: status === 'completed',
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-task-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        <div className="modal-header">
          <div className="modal-icon-badge">
            {task ? '✏️' : '➕'}
          </div>

          <div className="modal-title-wrap">
            <h3 id="task-modal-title" className="modal-title">
              {task ? 'Edit Task Details' : 'Create New Task'}
            </h3>

            <p className="modal-subtitle">
              {task
                ? 'Update task status, priority, description, or due date.'
                : 'Create a task and use AI to help write its description.'}
            </p>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="form-error-alert" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="task-modal-form">
          <div className="input-group">
            <label htmlFor="modal-task-title">
              Task Title <span className="required-star">*</span>
            </label>

            <input
              id="modal-task-title"
              type="text"
              placeholder="e.g. Implement database caching"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              required
              autoFocus
              className="form-control"
              disabled={submitting || aiLoading}
            />
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="modal-task-status">Status</label>

              <select
                id="modal-task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-control"
                disabled={submitting}
              >
                <option value="pending">⏳ Pending</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="modal-task-priority">Priority</label>

              <select
                id="modal-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="form-control"
                disabled={submitting}
              >
                <option value="low">🟢 Low Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="high">🔴 High Priority</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="modal-task-due">Due Date (Optional)</label>

            <input
              id="modal-task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="form-control"
              disabled={submitting}
            />
          </div>

          <div className="input-group">
            <label htmlFor="modal-task-desc">
              Description & Acceptance Criteria
            </label>

            <textarea
              id="modal-task-desc"
              rows="4"
              placeholder="Enter task requirements or generate a suggestion using AI..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-control"
              disabled={submitting}
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={generateDescription}
              disabled={submitting || aiLoading || !title.trim()}
              style={{ marginTop: '10px', width: '100%' }}
            >
              {aiLoading ? (
                <span className="btn-loading-flex">
                  <span className="btn-spinner"></span>
                  <span>Generating with AI...</span>
                </span>
              ) : (
                '✨ Generate Description with AI'
              )}
            </button>

            {aiMessage && (
              <p
                role="status"
                aria-live="polite"
                style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: aiError ? '#b45309' : '#15803d',
                }}
              >
                {aiMessage}
              </p>
            )}

            <small style={{ display: 'block', marginTop: '6px' }}>
              Review and edit AI-generated content before saving.
            </small>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting || aiLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || aiLoading}
              className="btn btn-primary"
            >
              {submitting ? (
                <span className="btn-loading-flex">
                  <span className="btn-spinner"></span>
                  <span>Saving...</span>
                </span>
              ) : task ? (
                '💾 Save Changes'
              ) : (
                '🚀 Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;