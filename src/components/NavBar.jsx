import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function NavBar({ theme, toggleTheme, showGuide, toggleGuide, user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand">
          <div className="brand-logo-icon">AWDF</div>
          <div className="brand-text">
            <span className="brand-title">FullStackHub</span>
            <span className="brand-subtitle">D25IT123 • Siddharth</span>
          </div>
        </Link>

        {/* Navigation Links using Link (Practical 2 Step 4) */}
        <nav className="navbar-nav" aria-label="Main Navigation">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/tasks"
            className={`nav-link ${isActive('/tasks') ? 'active' : ''}`}
          >
            Tasks (Full-Stack)
          </Link>
          <Link
            to="/projects"
            className={`nav-link ${isActive('/projects') ? 'active' : ''}`}
          >
            GitHub Repos
          </Link>
          <Link
            to="/contact"
            className={`nav-link ${isActive('/contact') ? 'active' : ''}`}
          >
            Contact
          </Link>
        </nav>

        {/* Right Action Toolbar */}
        <div className="navbar-actions">
          {/* Practical 2 Visibility Toggle button */}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleGuide}
            title="Toggle Quick Guide"
            aria-expanded={showGuide}
          >
            {showGuide ? '📘 Hide Guide' : '📖 Quick Guide'}
          </button>

          {/* Practical 2 Supplementary 2: Dark/Light Mode Toggle */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* User Authentication Pill / Button */}
          {user ? (
            <div className="user-profile-pill">
              <span className="user-name">👤 {user.name}</span>
              <button
                type="button"
                className="btn-logout"
                onClick={onLogout}
                title="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default NavBar;