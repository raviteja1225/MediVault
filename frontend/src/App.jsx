import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import { getCurrentUser } from './api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('medivault_token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing'); // 'landing', 'login', 'register', 'dashboard'

  useEffect(() => {
    async function restoreSession() {
      const savedToken = localStorage.getItem('medivault_token');
      if (savedToken) {
        try {
          const userData = await getCurrentUser(savedToken);
          setUser(userData);
          setToken(savedToken);
          setView('dashboard');
        } catch (err) {
          console.error('Session restoration failed:', err.message);
          localStorage.removeItem('medivault_token');
          setToken(null);
          setUser(null);
          setView('landing');
        }
      } else {
        setView('landing');
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('medivault_token', newToken);
    setToken(newToken);
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('medivault_token');
    setToken(null);
    setUser(null);
    setView('landing');
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading MediVault...</span>
          </div>
          <p className="mt-3 text-secondary fw-semibold">Connecting to MediVault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <Navbar user={user} onLogout={handleLogout} setView={setView} />

      <main className="flex-grow-1">
        {view === 'landing' && <LandingPage setView={setView} />}
        {view === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} setView={setView} />}
        {view === 'register' && <RegisterForm onLoginSuccess={handleLoginSuccess} setView={setView} />}
        {view === 'dashboard' && user && (
          user.role === 'patient' ? (
            <PatientDashboard user={user} token={token} onLogout={handleLogout} />
          ) : (
            <DoctorDashboard user={user} token={token} onLogout={handleLogout} />
          )
        )}
      </main>

      <footer className="bg-white border-top py-3 text-center text-secondary small mt-auto">
        <div className="container">
          <p className="mb-0">MediVault &copy; 2026 | Secure Medical Record Storage & Sharing (College Demonstration Project)</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
