import React, { useState, useRef } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import './InfoModal.css';
import humanExample from '../assets/images/human-example.png';
import aiExample from '../assets/images/ai-example.png';

const InfoModal = ({ isOpen, onClose }) => {
  const [isDismissing, setIsDismissing] = useState(false);
  const touchStartY = useRef(null);
  const { darkMode } = useDarkMode();

  if (!isOpen && !isDismissing) return null;

  // Handle modal dismissal with animation
  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsDismissing(false);
      onClose();
    }, 400);
  };

  // Track touch start position for swipe detection
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  // Handle swipe down to dismiss modal
  const handleTouchMove = (e) => {
    const touchEndY = e.touches[0].clientY;
    if (touchStartY.current && touchEndY - touchStartY.current > 50) {
      handleDismiss();
    }
  };

  return (
    <div
      className={`modal-overlay ${isDismissing ? 'transparent' : ''} ${darkMode ? 'dark-mode' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className={`modal-content ${isDismissing ? 'slide-down' : ''} ${darkMode ? 'dark-mode' : ''}`}>
        <span className="close-icon" onClick={handleDismiss}>✖</span>

        <h2>How to Play</h2>
        <hr className="section-separator" />

        <section className="instructions-section">
          <p>Test your skills in recognizing real human paintings versus AI-generated images.</p>
          <h3 className="rules-heading">Rules</h3>
          <hr className="section-separator" />
          <ul>
            <li>Swipe through each pair and tap on the image you believe is created by a human.</li>
            <li>Double-tap the image to enlarge it and zoom in.</li>
            <li>You have three tries to get all five pairs correct.</li>
            <li>The correct answers will be revealed after your final selection.</li>
            <li>Each daily puzzle increases in difficulty from Monday to Sunday.</li>
          </ul>
        </section>

        <section className="examples-section">
          <h3>Examples</h3>
          <hr className="section-separator" />
          <div className="example">
            <div className="example-image-container">
              <img src={humanExample} alt="Human Example" className="example-image" />
              <p>Human</p>
            </div>
            <div className="example-image-container">
              <img src={aiExample} alt="AI Example" className="example-image" />
              <p>AI</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <p className="cta-message">
            A new challenge is released daily at midnight EST. If you haven't already,{' '}
            <a href="/login" className="cta-link">sign up for a free Artalyze account</a> to track your stats!
          </p>
        </section>

        <footer className="modal-footer">© {new Date().getFullYear()} Artalyze</footer>
      </div>
    </div>
  );
};

export default InfoModal;
