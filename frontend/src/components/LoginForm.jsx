import React, { useState } from 'react';
import { loginUser } from '../api';

export default function LoginForm({ onLoginSuccess, setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginUser(username, password);
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="mv-card p-4 p-sm-5">
            <h3 className="fw-bold text-center mb-1">Sign In to MediVault</h3>
            <p className="text-secondary text-center small mb-4">
              Enter your credentials to access your health portal
            </p>

            {error && (
              <div className="alert alert-danger py-2 small rounded-3" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary">Username</label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold small text-secondary">Password</label>
                <input
                  type="password"
                  className="form-control rounded-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 rounded-3 fw-bold"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : null}
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="text-center mt-4">
              <span className="text-secondary small">Don't have an account? </span>
              <button
                className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
                onClick={() => setView('register')}
              >
                Register here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
