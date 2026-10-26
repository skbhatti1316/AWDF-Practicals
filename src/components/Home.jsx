import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../api';

function Home() {
  const [serverOnline, setServerOnline] = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/`)
      .then((res) => res.json())
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
  }, []);

  return (
    <div className="home-container animate-fade-in">
      {/* Hero Section */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-pill">
            <span className={`status-dot ${serverOnline ? 'online' : 'checking'}`}></span>
            <span>
              {serverOnline === null
                ? 'Connecting to Express Backend...'
                : serverOnline
                ? 'Express & MongoDB Backend Live on Port 5000'
                : 'Backend Server Offline (Start via npm start)'}
            </span>
          </div>

          <h1 className="hero-headline">
            Advanced Web Development Frameworks
            <span className="gradient-text"> Full-Stack Hub</span>
          </h1>

          <p className="hero-description">
            A comprehensive, production-grade application engineered by <strong>Siddharth Bhatti</strong> (D25IT123)
            demonstrating reactive state management, asynchronous REST API consumers, and MongoDB full-stack integration.
          </p>

          <div className="hero-cta-group">
            <Link to="/tasks" className="btn btn-primary btn-lg">
              🚀 Open Task Manager (Full Stack)
            </Link>
            <Link to="/projects" className="btn btn-secondary btn-lg">
              🐙 GitHub Repo Explorer
            </Link>
            <Link to="/contact" className="btn btn-outline btn-lg">
              📬 Contact Siddharth
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Stack Badges */}
      <section className="tech-stack-section">
        <h3 className="section-small-title">Integrated Technology Stack</h3>
        <div className="tech-badge-list">
          <span className="tech-badge">⚛️ React 19</span>
          <span className="tech-badge">🧭 React Router v7</span>
          <span className="tech-badge">🟢 Node.js v22</span>
          <span className="tech-badge">⚡ Express.js 5</span>
          <span className="tech-badge">🍃 MongoDB Atlas</span>
          <span className="tech-badge">🦫 Mongoose 9</span>
          <span className="tech-badge">🔐 JWT Authentication</span>
          <span className="tech-badge">⚡ Vite 8</span>
        </div>
      </section>

      {/* Practicals Feature Grid */}
      <section className="practicals-grid-section">
        <div className="section-header">
          <span className="badge badge-primary">Course Milestones</span>
          <h2 className="section-title">Completed Practical Specifications</h2>
          <p className="section-subtitle">
            Every core and supplementary problem requirement from Practicals 2 through 6 has been meticulously implemented.
          </p>
        </div>

        <div className="features-grid">
          {/* Practical 2 */}
          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-tag">Practical 2</span>
              <span className="feature-icon">🧭</span>
            </div>
            <h3>Reactive State & Routing</h3>
            <p>
              Client-side navigation with React Router, <code>useState</code> hooks, live character counting on controlled contact input, custom 404 handler, and dark/light mode toggle.
            </p>
            <ul className="feature-checklist">
              <li>✓ React Router SPA navigation</li>
              <li>✓ Controlled input with live character counter</li>
              <li>✓ Custom 404 Not Found error page</li>
              <li>✓ Dynamic dark/light mode on root element</li>
            </ul>
            <Link to="/contact" className="feature-link">
              Test Contact Form →
            </Link>
          </div>

          {/* Practical 3 */}
          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-tag">Practical 3</span>
              <span className="feature-icon">📡</span>
            </div>
            <h3>REST API Consumption</h3>
            <p>
              Asynchronous data fetching with <code>useEffect</code>, loading spinner, error boundary with retry triggers, live name search filter, and GitHub star badges.
            </p>
            <ul className="feature-checklist">
              <li>✓ Asynchronous fetch on component mount</li>
              <li>✓ Animated loading spinner component</li>
              <li>✓ Error state with interactive retry button</li>
              <li>✓ Real-time search filter & star counters</li>
            </ul>
            <Link to="/projects" className="feature-link">
              Explore Repositories →
            </Link>
          </div>

          {/* Practical 4 & 5 */}
          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-tag">Practical 4 & 5</span>
              <span className="feature-icon">🍃</span>
            </div>
            <h3>Express REST API & MongoDB</h3>
            <p>
              Express middleware pipeline (request logging, Content-Type enforcement, ObjectId format validation, 404 handler, global error handler) and Mongoose schema design.
            </p>
            <ul className="feature-checklist">
              <li>✓ Logging & Content-Type validation middleware</li>
              <li>✓ Mongoose schema with priority enum</li>
              <li>✓ Pre-save hook trimming title whitespace</li>
              <li>✓ GET /tasks/:id with structured 404 JSON</li>
            </ul>
            <a
              href="http://localhost:5000/tasks"
              target="_blank"
              rel="noreferrer"
              className="feature-link"
            >
              Inspect Live API Endpoint ↗
            </a>
          </div>

          {/* Practical 6 & 7 */}
          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-tag">Practical 6 & 7</span>
              <span className="feature-icon">🚀</span>
            </div>
            <h3>Full Stack Integration</h3>
            <p>
              React connected to Node + MongoDB with central <code>api.js</code>, optimistic UI updates, delete confirmation dialog modal, toast notifications, and JWT auth.
            </p>
            <ul className="feature-checklist">
              <li>✓ Centralized <code>api.js</code> backend client</li>
              <li>✓ Optimistic UI task creation & status toggle</li>
              <li>✓ Accessible delete confirmation modal</li>
              <li>✓ Dynamic toast notification component</li>
            </ul>
            <Link to="/tasks" className="feature-link">
              Launch Task Manager →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;