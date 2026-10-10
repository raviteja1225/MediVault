import React from 'react';

export default function Navbar({ user, onLogout, setView }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm py-3 mb-4">
      <div className="container">
        <button
          className="navbar-brand border-0 bg-transparent fw-bold fs-3 text-primary d-flex align-items-center gap-2 p-0"
          onClick={() => setView(user ? 'dashboard' : 'landing')}
          style={{ cursor: 'pointer' }}
        >
          <span className="p-2 bg-primary text-white rounded-3 fs-5 d-inline-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
            🏥
          </span>
          MediVault
        </button>

        <div className="d-flex align-items-center gap-3">
          {user ? (
            <>
              <span className={`badge px-3 py-2 rounded-pill ${user.role === 'patient' ? 'mv-badge-patient' : 'mv-badge-doctor'}`}>
                {user.role === 'patient' ? '👤 Patient' : '🩺 Doctor'}
              </span>
              <span className="text-secondary fw-semibold small d-none d-sm-inline">
                {user.username}
              </span>
              <button className="btn btn-outline-danger btn-sm px-3 rounded-3" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-outline-primary px-3 rounded-3" onClick={() => setView('login')}>
                Sign In
              </button>
              <button className="btn btn-primary px-3 rounded-3" onClick={() => setView('register')}>
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
