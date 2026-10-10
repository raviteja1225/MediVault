import React, { useState } from 'react';
import { registerPatient, registerDoctor } from '../api';

export default function RegisterForm({ onLoginSuccess, setView }) {
  const [role, setRole] = useState('patient'); // 'patient' or 'doctor'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Patient specific fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Doctor specific fields
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let data;
      if (role === 'patient') {
        data = await registerPatient({
          username,
          email,
          password,
          date_of_birth: dateOfBirth || null,
          phone,
          address,
        });
      } else {
        data = await registerDoctor({
          username,
          email,
          password,
          specialization,
          license_number: licenseNumber,
        });
      }
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7 col-lg-6">
          <div className="mv-card p-4 p-sm-5">
            <h3 className="fw-bold text-center mb-1">Create MediVault Account</h3>
            <p className="text-secondary text-center small mb-4">
              Select your role to get started with secure health records
            </p>

            {/* Role Selection Tabs */}
            <div className="d-flex rounded-3 bg-light p-1 mb-4 border">
              <button
                type="button"
                className={`btn flex-grow-1 rounded-3 py-2 fw-semibold btn-sm ${
                  role === 'patient' ? 'btn-primary text-white shadow-sm' : 'btn-light text-secondary'
                }`}
                onClick={() => setRole('patient')}
              >
                👤 Register as Patient
              </button>
              <button
                type="button"
                className={`btn flex-grow-1 rounded-3 py-2 fw-semibold btn-sm ${
                  role === 'doctor' ? 'btn-primary text-white shadow-sm' : 'btn-light text-secondary'
                }`}
                onClick={() => setRole('doctor')}
              >
                🩺 Register as Doctor
              </button>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small rounded-3" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary">Username *</label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary">Email</label>
                <input
                  type="email"
                  className="form-control rounded-3"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small text-secondary">Password *</label>
                <input
                  type="password"
                  className="form-control rounded-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              {/* Conditional Role-Specific Fields */}
              {role === 'patient' ? (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold small text-secondary">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control rounded-3"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold small text-secondary">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control rounded-3"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +1 555-0199"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold small text-secondary">Address</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, City, Zip"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary">Medical Specialization</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Cardiology, Neurology, General Medicine"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold small text-secondary">Medical License Number</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. MD-99201"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 rounded-3 fw-bold"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : null}
                {loading ? 'Creating Account...' : `Register as ${role === 'patient' ? 'Patient' : 'Doctor'}`}
              </button>
            </form>

            <div className="text-center mt-4">
              <span className="text-secondary small">Already have an account? </span>
              <button
                className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
                onClick={() => setView('login')}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
