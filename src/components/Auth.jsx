import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../api';
import { useToast } from './Toast';

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await loginUser({ email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
        addToast(`Welcome back, ${data.user.name}!`, 'success');
        navigate('/tasks');
      } else {
        await registerUser({ name, email, password });
        addToast('Registration successful! Please log in now.', 'success');
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      const errMsg = err.message || 'Authentication request failed.';
      setError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Demo Login for quick testing
  const handleQuickDemo = async () => {
    setLoading(true);
    setError('');
    try {
      // Try logging in with demo account
      const demoEmail = 'student@charusat.edu.in';
      const demoPass = 'Password123!';
      try {
        const data = await loginUser({ email: demoEmail, password: demoPass });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
        addToast(`Logged in as Demo User (${data.user.name})`, 'success');
        navigate('/tasks');
        return;
      } catch {
        // If demo user does not exist yet, register and then login
        await registerUser({ name: 'Siddharth (Demo)', email: demoEmail, password: demoPass });
        const data = await loginUser({ email: demoEmail, password: demoPass });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
        addToast(`Demo account created and logged in!`, 'success');
        navigate('/tasks');
      }
    } catch (err) {
      // Fallback local session if remote mongo is unreachable
      const mockUser = { id: 'demo-local', name: 'Siddharth Bhatti', email: 'skbhatti1316@gmail.com' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      onLogin(mockUser);
      addToast('Entered Demo Guest Session.', 'info');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container animate-fade-in">
      <div className="auth-card card">
        <div className="auth-badge">
          <span>Practical 7: JWT Authentication</span>
        </div>

        <h2 className="auth-title">
          {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to access secure endpoints and personal tasks.'
            : 'Register your details to obtain a JSON Web Token.'}
        </p>

        {error && (
          <div className="auth-error-banner" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="e.g. Siddharth Bhatti"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-control"
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="e.g. skbhatti1316@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="input-group">
            <label htmlFor="auth-pass">Password</label>
            <input
              id="auth-pass"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In with JWT'
              : 'Register Account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={handleQuickDemo}
          disabled={loading}
          className="btn btn-outline btn-block"
        >
          ⚡ 1-Click Fast Demo Login
        </button>

        <div className="auth-footer-toggle">
          {mode === 'login' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Register here
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Log in here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;