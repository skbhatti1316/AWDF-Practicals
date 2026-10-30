import { useState, useEffect } from 'react';
import { updateProfile } from '../api';
import { useToast } from './Toast';

function ProfileSettingsModal({ isOpen, user, onClose, onUserUpdated, initialTab = 'profile', theme, toggleTheme }) {
  const [tab, setTab] = useState(() => initialTab);
  const [name, setName] = useState(() => user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await updateProfile({ name: name.trim() });
      if (res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
        if (onUserUpdated) onUserUpdated(res.user);
      }
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      addToast('Password changed successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to change password.');
      addToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-profile-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="modal-header">
          <div className="modal-icon-badge">👤</div>
          <div className="modal-title-wrap">
            <h3 id="profile-modal-title" className="modal-title">
              {tab === 'profile' ? 'User Profile' : 'Application Settings'}
            </h3>
            <p className="modal-subtitle">
              {user ? `Signed in as ${user.email}` : 'Demo Guest Account'}
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

        {/* Tab switch */}
        <div className="modal-tab-nav" role="tablist">
          <button
            type="button"
            className={`modal-tab-btn ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setTab('profile');
              setError('');
            }}
          >
            👤 Profile Details
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setTab('settings');
              setError('');
            }}
          >
            ⚙️ Account Settings
          </button>
        </div>

        {error && (
          <div className="form-error-alert" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {tab === 'profile' ? (
          <div className="profile-tab-content">
            <div className="profile-avatar-banner">
              <div className="profile-large-avatar">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TF'}
              </div>
              <div className="profile-info-text">
                <h4>{user?.name || 'Siddharth Bhatti (Guest)'}</h4>
                <p className="text-muted">{user?.email || 'student@charusat.edu.in'}</p>
                <span className="profile-badge-pill">AWDF Practical 7 Authenticated</span>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="detail-item">
                <span className="detail-label">Developer ID</span>
                <span className="detail-value">D25IT123</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Institution</span>
                <span className="detail-value">CHARUSAT • CSPIT / DEPSTAR</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Backend Architecture</span>
                <span className="detail-value">Express 5 + Mongoose 9 + NodeCache</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Token Security</span>
                <span className="detail-value">HMAC SHA-256 (JWT)</span>
              </div>
            </div>

            <form onSubmit={handleUpdateName} className="profile-name-form">
              <div className="input-group">
                <label htmlFor="profile-name-input">Display Name</label>
                <div className="input-inline-btn-wrap">
                  <input
                    id="profile-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control"
                    required
                    disabled={saving}
                  />
                  <button
                    type="submit"
                    disabled={saving || !name.trim() || name === user?.name}
                    className="btn btn-primary"
                  >
                    {saving ? 'Saving...' : 'Update Name'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="settings-tab-content">
            {/* Theme Toggle setting */}
            <div className="settings-section">
              <h4>Interface Appearance</h4>
              <div className="settings-row">
                <div>
                  <strong>Color Theme</strong>
                  <p className="text-muted">Toggle between high-contrast Dark Mode and clean Light Mode.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-theme-switch"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
                </button>
              </div>
            </div>

            {/* Password Change section */}
            <div className="settings-section">
              <h4>Security & Credentials</h4>
              <form onSubmit={handleChangePassword} className="settings-password-form">
                <div className="input-group">
                  <label htmlFor="settings-curr-pass">Current Password</label>
                  <input
                    id="settings-curr-pass"
                    type="password"
                    placeholder="Enter existing password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="form-control"
                    disabled={saving}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="settings-new-pass">New Password (Min. 8 characters)</label>
                  <input
                    id="settings-new-pass"
                    type="password"
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    className="form-control"
                    disabled={saving}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !currentPassword || newPassword.length < 8}
                  className="btn btn-primary"
                >
                  {saving ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettingsModal;
