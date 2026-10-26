import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="notfound-container">
      <div className="notfound-card animate-fade-in">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-subtitle">
          The requested path does not exist or has been moved. Use the navigation links below to return to safety.
        </p>
        <div className="notfound-actions">
          <Link to="/" className="btn btn-primary">
            ← Back to Home
          </Link>
          <Link to="/tasks" className="btn btn-secondary">
            View Task Manager
          </Link>
          <Link to="/projects" className="btn btn-outline">
            GitHub Projects
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
