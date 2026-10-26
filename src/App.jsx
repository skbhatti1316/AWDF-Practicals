import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import NavBar from './components/NavBar';
import ToastProvider from './components/Toast';

// Lazy-loaded page components for optimal performance
const Home = lazy(() => import('./components/Home'));
const Projects = lazy(() => import('./components/Projects'));
const GithubProjects = lazy(() => import('./components/GithubProjects'));
const Contact = lazy(() => import('./components/Contact'));
const Auth = lazy(() => import('./components/Auth'));
const NotFound = lazy(() => import('./components/NotFound'));

function App() {
  // Practical 2 Supplementary 2: Dark/light mode state applied to root element
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('awdf-theme') || 'light';
  });

  // Practical 2 State Requirement: UI element visibility toggle
  const [showGuide, setShowGuide] = useState(false);

  // User authentication state (Practical 7)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Apply theme class to document root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('awdf-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <ToastProvider>
      <div className="app-layout">
        {/* Navigation Bar */}
        <NavBar
          theme={theme}
          toggleTheme={toggleTheme}
          showGuide={showGuide}
          toggleGuide={() => setShowGuide(!showGuide)}
          user={user}
          onLogout={handleLogout}
        />

        {/* Quick Guide Drawer (Practical 2 UI Visibility Toggle) */}
        {showGuide && (
          <aside className="quick-guide-banner animate-slide-down" aria-label="Course Guide">
            <div className="guide-content-wrap">
              <div className="guide-header">
                <h3>📖 AWDF Practical Reference & Quick Navigation Guide</h3>
                <button
                  type="button"
                  className="btn-close-guide"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close guide"
                >
                  ✕ Close
                </button>
              </div>
              <div className="guide-grid">
                <div className="guide-col">
                  <strong>Practical 2: React State & Routing</strong>
                  <p>Client-side routing with React Router v7, controlled input in <Link to="/contact">Contact</Link> with live character counter, custom <Link to="/not-found-demo">404 page</Link>, and the theme toggle in top-right.</p>
                </div>
                <div className="guide-col">
                  <strong>Practical 3: REST API Integration</strong>
                  <p>Explore <Link to="/projects">GitHub Repositories</Link> fetching live data with loading spinner, error boundary, retry triggers, and instant search.</p>
                </div>
                <div className="guide-col">
                  <strong>Practical 4, 5 & 6: Full Stack Integration</strong>
                  <p>Interactive <Link to="/tasks">Task Manager</Link> wired to Express (port 5000) and MongoDB Atlas with optimistic updates and delete confirmation dialogs.</p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area with Suspense Fallback */}
        <main className="app-main">
          <Suspense
            fallback={
              <div className="page-loading-skeleton" role="status">
                <div className="spinner-ring"></div>
                <p>Loading application view...</p>
              </div>
            }
          >
            <Routes>
              {/* Home Route (Practical 1 & 2) */}
              <Route path="/" element={<Home />} />

              {/* Tasks CRUD Route (Practical 4, 5, 6) */}
              <Route path="/tasks" element={<Projects />} />

              {/* GitHub Repositories Route (Practical 3 REST API Integration) */}
              <Route path="/projects" element={<GithubProjects />} />

              {/* Contact Form Route (Practical 2 Controlled Form & Character Count) */}
              <Route path="/contact" element={<Contact />} />

              {/* Authentication Route (Practical 7) */}
              <Route path="/login" element={<Auth onLogin={handleLogin} />} />

              {/* Custom 404 Route for Any Undefined Path (Practical 2 Supplementary 1) */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        {/* Global Footer */}
        <footer className="app-footer">
          <div className="footer-container">
            <p className="footer-copy">
              © {new Date().getFullYear()} <strong>Siddharth Kalpeshkumar Bhatti</strong> (D25IT123) • B.Tech Information Technology
            </p>
            <p className="footer-institution">
              Advanced Web Development Frameworks (ITUE301) • CSPIT / DEPSTAR, CHARUSAT University
            </p>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <span>•</span>
              <Link to="/tasks">Tasks</Link>
              <span>•</span>
              <Link to="/projects">GitHub API</Link>
              <span>•</span>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}

export default App;