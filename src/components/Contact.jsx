import React, { useState } from 'react';
import { useToast } from './Toast';

function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('skbhatti1316@gmail.com');
    setCopied(true);
    addToast('Email copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      addToast('Please enter a message before submitting.', 'error');
      return;
    }
    addToast('Thank you! Your message has been received.', 'success');
    setMessage('');
    setName('');
    setEmail('');
  };

  const handleClear = () => {
    setMessage('');
    setName('');
    setEmail('');
    addToast('Form cleared.', 'info');
  };

  return (
    <section className="page-section animate-fade-in">
      <div className="section-header">
        <span className="badge badge-primary">Practical 2: Controlled Form & State</span>
        <h1 className="section-title">Get in Touch</h1>
        <p className="section-subtitle">
          Demonstrating controlled inputs, reactive <code>useState</code> updates, and live character counting.
        </p>
      </div>

      <div className="contact-grid">
        {/* Contact Info Card */}
        <div className="contact-info-card">
          <div className="avatar-circle">SB</div>
          <h2>Siddharth Kalpeshkumar Bhatti</h2>
          <p className="text-muted">Student ID: D25IT123 | B.Tech IT</p>
          <p className="text-muted">Faculty of Technology and Engineering (CSPIT / DEPSTAR), CHARUSAT</p>

          <div className="contact-details-list">
            <div className="contact-item">
              <span className="contact-item-icon">📱</span>
              <div>
                <div className="contact-item-label">Mobile Phone</div>
                <a href="tel:9016931339" className="contact-item-value">+91 9016931339</a>
              </div>
            </div>

            <div className="contact-item">
              <span className="contact-item-icon">✉️</span>
              <div style={{ flex: 1 }}>
                <div className="contact-item-label">Email Address</div>
                <a href="mailto:skbhatti1316@gmail.com" className="contact-item-value">
                  skbhatti1316@gmail.com
                </a>
              </div>
              <button
                type="button"
                className="btn-copy-small"
                onClick={handleCopyEmail}
                title="Copy email address"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>

            <div className="contact-item">
              <span className="contact-item-icon">🌐</span>
              <div>
                <div className="contact-item-label">GitHub Profile</div>
                <a
                  href="https://github.com/skbhatti1316"
                  target="_blank"
                  rel="noreferrer"
                  className="contact-item-value"
                >
                  github.com/skbhatti1316 ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Controlled Form Card */}
        <div className="contact-form-card">
          <h3>Send a Direct Message</h3>
          <p className="text-muted form-hint">
            Every keystroke is synchronized in real-time with React <code>useState</code>.
          </p>

          <form onSubmit={handleSubmit} className="form-group">
            <div className="input-group">
              <label htmlFor="contact-name">Your Name</label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="form-control"
              />
            </div>

            <div className="input-group">
              <label htmlFor="contact-email">Your Email</label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-control"
              />
            </div>

            <div className="input-group">
              <div className="label-with-counter">
                <label htmlFor="message">Your Message (Controlled Input)</label>
                <span className={`character-counter-badge ${message.length > 200 ? 'counter-warn' : ''}`}>
                  {message.length} characters
                </span>
              </div>
              <textarea
                id="message"
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here to see live state synchronization..."
                className="form-control"
                required
              />
            </div>

            {/* Live Message Preview Box (Practical 2 Requirement) */}
            <div className="live-preview-box">
              <div className="preview-label">Live State Sync Preview:</div>
              <div className="preview-content">
                {message ? (
                  <span>"{message}"</span>
                ) : (
                  <em className="text-muted">Start typing above to see your text rendered here live...</em>
                )}
              </div>
              <div className="preview-meta">
                <span>Character Count: <strong>{message.length}</strong></span>
                <span>Word Count: <strong>{message.trim() ? message.trim().split(/\s+/).length : 0}</strong></span>
              </div>
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn btn-primary">
                Send Message
              </button>
              {message && (
                <button type="button" onClick={handleClear} className="btn btn-secondary">
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Contact;