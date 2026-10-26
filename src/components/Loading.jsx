import React from 'react';

function Loading({ message = "Loading data..." }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner-ring"></div>
      <p className="loading-text">{message}</p>
    </div>
  );
}

export default Loading;