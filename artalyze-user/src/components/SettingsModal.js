import React from 'react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleLogout = () => {
    localStorage.clear(); // Clear all local storage
    window.location.href = '/'; // Redirect to the homepage or login page
  };

  const currentYear = new Date().getFullYear(); // Dynamically fetch the current year

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal-content">
        <h2>Settings</h2>
        <ul className="settings-options">
          <li>
            <button
              className="settings-button"
              onClick={() => {
                onClose();
                window.location.href = '/';
              }}
            >
              About
            </button>
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
                window.location.href = 'mailto:info@artalyze.app?subject=Bug Report';
              }}
            >
              Report a Bug
            </button>
          </li>
          <li>
            <button className="settings-button" onClick={handleLogout}>
              Log Out
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
