import React, { useState } from 'react';
import './InfoModal.css';
import humanExample from '../assets/images/human-example.png';
import aiExample from '../assets/images/ai-example.png';

const InfoModal = ({ isOpen, onClose }) => {
  const [isDismissing, setIsDismissing] = useState(false);

  if (!isOpen && !isDismissing) return null;

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsDismissing(false); // Reset state
      onClose(); // Trigger modal close
    }, 400); // Match the CSS animation duration
  };

  return (
    <div className={`modal-overlay ${isDismissing ? 'transparent' : ''}`}>
      <div className={`modal-content ${isDismissing ? 'slide-down' : ''}`}>
        <span className="close-icon" onClick={handleDismiss}>✖</span>
        <h2>How to Play</h2>
        <hr className="section-separator" />

        <section className="instructions-section">
          <p>Test your skills in recognizing real human paintings versus AI-generated images.</p>
          <h3 className="rules-heading">Rules</h3>
          <hr className="section-separator" />
          <ul>
            <li>Swipe through each pair and choose the painting you believe is created by a human.</li>
            <li>You have three tries to get all five pairs correct.</li>
            <li>The correct answers will be revealed after your final selection.</li>
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
