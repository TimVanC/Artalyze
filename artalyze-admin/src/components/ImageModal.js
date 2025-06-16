import React from 'react';
import './ImageModal.css';

const ImageModal = ({ imageUrl, onClose }) => {
  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        <img src={imageUrl} alt="Enlarged view" />
      </div>
    </div>
  );
};

export default ImageModal; 