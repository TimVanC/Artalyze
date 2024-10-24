import React from 'react';
import './InfoModal.css'; // Ensure CSS path is correct
import humanExample from '../assets/images/human-example.png';
import aiExample from '../assets/images/ai-example.png';

const InfoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
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
            <img src={humanExample} alt="Human Example" className="example-image"/>
                <p>Human</p>
            </div>
            <div className="example-image-container">
            <img src={aiExample} alt="AI Example" className="example-image"/>
            <p>AI</p>
            </div>
          </div>
        </section>

        <section className="additional-info">
          <p>A new challenge is released every day at 12:00 AM EST. Come back daily for a new chance to test your skills!</p>
        </section>
      </div>
    </div>
  );
};

export default InfoModal;
