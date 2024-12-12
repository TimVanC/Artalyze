import React from 'react';
import './InfoModal.css'; // Ensure the CSS path is correct
import humanExample from '../assets/images/human-example.png';
import aiExample from '../assets/images/ai-example.png';

const InfoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <span className="close-icon" onClick={onClose}>
          ✖
        </span>
        <h2>How to Play</h2>

        <section className="instructions-section">
          <p>Test your skills in recognizing real human paintings versus AI-generated images.</p>
          <ul>
            <li>Swipe through each pair and choose the painting you believe is created by a human.</li>
            <li>You have three tries to get all five pairs correct.</li>
            <li>The correct answers will be revealed after your final selection.</li>
          </ul>
        </section>

        <section className="examples-section">
          <h3>Examples</h3>
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
    A new challenge is released daily at midnight EST. If you haven't already, <a href="/login" className="cta-link">sign up for a free Artalyze account</a> to track your stats!
  </p>
</section>


      </div>
    </div>
  );
};

export default InfoModal;
