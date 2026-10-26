import React from 'react';

function ErrorMessage({ message = "An error occurred while fetching data.", onRetry }) {
  return (
    <div className="error-card" role="alert">
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <h4 className="error-title">Network / Request Error</h4>
        <p className="error-description">{message}</p>
        {onRetry && (
          <button
            type="button"
            className="btn btn-retry"
            onClick={onRetry}
          >
            ↻ Retry Request
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorMessage;