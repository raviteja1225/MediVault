import React from 'react';

export default function LandingPage({ setView }) {
  return (
    <div className="container py-4">
      <div className="mv-hero mb-5 text-center text-lg-start">
        <div className="row align-items-center">
          <div className="col-lg-8">
            <h1 className="display-4 fw-bold mb-3">Secure Medical Record Storage & Sharing</h1>
            <p className="lead mb-4 opacity-90">
              MediVault empowers patients with complete control over their medical records, lab reports, and prescriptions with time-bound, secure doctor sharing permissions.
            </p>
            <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
              <button className="btn btn-light text-primary fw-bold px-4 py-2 rounded-3 shadow-sm" onClick={() => setView('register')}>
                Get Started
              </button>
              <button className="btn btn-outline-light fw-bold px-4 py-2 rounded-3" onClick={() => setView('login')}>
                Sign In to Portal
              </button>
            </div>
          </div>
          <div className="col-lg-4 d-none d-lg-block text-center fs-1">
            🩺 📋 🔒
          </div>
        </div>
      </div>

      <div className="row g-4 text-center">
        <div className="col-md-4">
          <div className="mv-card p-4 h-100">
            <div className="fs-1 mb-2">👤</div>
            <h4 className="fw-bold text-dark mb-2">Patient Records</h4>
            <p className="text-secondary small">
              Upload, manage, and organize your prescriptions, lab reports, and health history safely.
            </p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="mv-card p-4 h-100">
            <div className="fs-1 mb-2">🩺</div>
            <h4 className="fw-bold text-dark mb-2">Doctor Access</h4>
            <p className="text-secondary small">
              Doctors receive read-only access to authorized patient records with automatic time expiration.
            </p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="mv-card p-4 h-100">
            <div className="fs-1 mb-2">🛡️</div>
            <h4 className="fw-bold text-dark mb-2">Role Separation</h4>
            <p className="text-secondary small">
              Strict server-side permission enforcement ensures user data privacy and authorization checks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
