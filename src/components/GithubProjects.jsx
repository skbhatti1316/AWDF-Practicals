import React, { useState, useEffect, useCallback } from 'react';
import Loading from './Loading';
import ErrorMessage from './ErrorMessage';
import { fetchGithubRepos } from '../api';

function GithubProjects() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulateError, setSimulateError] = useState(false);
  const [username, setUsername] = useState('skbhatti1316');
  const [inputUsername, setInputUsername] = useState('skbhatti1316');

  const loadRepositories = useCallback(async (forcedError = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGithubRepos(username, forcedError);
      setRepos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch repositories.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadRepositories(simulateError);
  }, [loadRepositories, simulateError]);

  const handleRetry = () => {
    setSimulateError(false);
    loadRepositories(false);
  };

  const handleSimulateToggle = () => {
    const nextState = !simulateError;
    setSimulateError(nextState);
    loadRepositories(nextState);
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (inputUsername.trim()) {
      setUsername(inputUsername.trim());
      setSimulateError(false);
    }
  };

  // Filter repositories dynamically by name (Practical 3 Supplementary 2)
  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section className="page-section animate-fade-in">
      <div className="section-header">
        <span className="badge badge-primary">Practical 3: REST API Integration</span>
        <h1 className="section-title">GitHub Repository Explorer</h1>
        <p className="section-subtitle">
          Dynamic asynchronous data fetching with <code>useEffect</code>, loading spinner, error boundary, retry triggers, and star counts.
        </p>
      </div>

      {/* Control Bar: Search Filter, Custom Username, and Error Simulator */}
      <div className="github-controls-card">
        <form onSubmit={handleUserSubmit} className="github-user-form">
          <label htmlFor="gh-user">GitHub User:</label>
          <div className="user-input-wrap">
            <input
              id="gh-user"
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="e.g. skbhatti1316"
              className="form-control"
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Fetch
            </button>
          </div>
        </form>

        <div className="github-search-wrap">
          <label htmlFor="repo-search">Filter Repositories:</label>
          <input
            id="repo-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by repo name or description..."
            className="form-control"
          />
        </div>

        <div className="github-test-wrap">
          <label>Faculty Demo Tool:</label>
          <button
            type="button"
            className={`btn btn-sm ${simulateError ? 'btn-danger' : 'btn-outline'}`}
            onClick={handleSimulateToggle}
            title="Simulates a broken network call to demonstrate error state"
          >
            {simulateError ? '⚠️ Disable Error Simulation' : '⚡ Simulate Network Error'}
          </button>
        </div>
      </div>

      {/* States: Loading, Error, or Success Repository List */}
      {loading ? (
        <Loading message={`Fetching repositories for @${username}...`} />
      ) : error ? (
        <ErrorMessage message={error} onRetry={handleRetry} />
      ) : (
        <div className="repo-results-container">
          <div className="repo-results-meta">
            <span>Showing <strong>{filteredRepos.length}</strong> of <strong>{repos.length}</strong> repositories for <strong>@{username}</strong></span>
            {searchQuery && (
              <button
                type="button"
                className="btn-link"
                onClick={() => setSearchQuery('')}
              >
                Clear filter
              </button>
            )}
          </div>

          {filteredRepos.length === 0 ? (
            <div className="empty-state-card">
              <p>No repositories match your search query "{searchQuery}".</p>
            </div>
          ) : (
            <div className="repo-grid">
              {filteredRepos.map((repo) => (
                <div key={repo.id} className="repo-card">
                  <div className="repo-card-header">
                    <h3 className="repo-name">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="repo-link"
                      >
                        {repo.name} ↗
                      </a>
                    </h3>
                    {/* Star count alongside name (Practical 3 Supplementary 3) */}
                    <div className="repo-stars-badge" title={`${repo.stargazers_count} stars`}>
                      ⭐ {repo.stargazers_count || 0}
                    </div>
                  </div>

                  <p className="repo-description">
                    {repo.description || 'No description provided.'}
                  </p>

                  <div className="repo-card-footer">
                    {repo.language && (
                      <span className="repo-language-badge">
                        ● {repo.language}
                      </span>
                    )}
                    <span className="repo-updated">
                      Updated: {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default GithubProjects;
