import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, isLoggedIn }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.body.classList.toggle('dark-mode', savedDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.body.classList.toggle('dark-mode', newMode);
    localStorage.setItem('darkMode', newMode);
  };

  const handleLogout = () => {
    localStorage.clear(); // Clear all local storage
    window.location.href = '/'; // Redirect to the homepage or login page
  };

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear(); // Dynamically fetch the current year

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal-content">
        <h2>Settings</h2>
        <ul className="settings-options">
          <li>
            <div className="dark-mode-toggle-container">
              <span>Dark Mode</span>
              <div
                className={`dark-mode-toggle ${darkMode ? 'active' : ''}`}
                onClick={toggleDarkMode}
              ></div>
            </div>
          </li>
          <li>
            <button
              className="settings-button"
              onClick={() => {
                onClose();
                window.location.href = 'mailto:info@artalyze.app?subject=Feedback';
              }}
            >
              Feedback
            </button>
          </li>
          <li>
            <button
              className="settings-button"
              onClick={() => {
                onClose();
                window.location.href = '/privacy-policy';
              }}
            >
              Privacy Policy
            </button>
          </li>
          <li>
            <button
              className="settings-button"
              onClick={() => {
                onClose();
                window.location.href = 'mailto:info@artalyze.app?subject=Bug Report';
              }}
            >
              Report a Bug
            </button>
          </li>
          <li>
            <button
              className="settings-button"
              onClick={() => {
                onClose();
                window.location.href = '/terms-of-service';
              }}
            >
              Terms of Service
            </button>
          </li>
          <li>
            <button
              className="settings-button"
              onClick={() => {
                onClose();
                if (isLoggedIn) {
                  handleLogout(); // Log out if user is logged in
                } else {
                  window.location.href = '/login'; // Redirect to login/create account page
                }
              }}
            >
              {isLoggedIn ? 'Log Out' : 'Create Account'}
            </button>
          </li>
        </ul>
        <footer className="settings-footer">
          &copy; {currentYear} Artalyze
        </footer>
        <button className="close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
  
};

export default SettingsModal;
