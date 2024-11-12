import React from 'react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal-content">
        <h2>Settings</h2>
        <ul className="settings-options">
          <li onClick={onClose}><button className="settings-button" onClick={() => window.location.href = '/'}>About</button></li>
          <li onClick={onClose}><button className="settings-button" onClick={() => window.location.href = 'mailto:info@artalyze.app?subject=Feedback'}>Feedback</button></li>
          <li onClick={onClose}><button className="settings-button" onClick={() => window.location.href = 'mailto:info@artalyze.app?subject=Bug Report'}>Report a Bug</button></li>
          <li onClick={onClose}><button className="settings-button" onClick={() => { localStorage.removeItem('authToken'); window.location.href = '/'; }}>Log Out</button></li>
        </ul>
        <button className="close-modal" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default SettingsModal;
