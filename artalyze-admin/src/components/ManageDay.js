import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axiosInstance from '../axiosInstance';
import ImageModal from './ImageModal';
import './ManageDay.css';

const ManageDay = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [imagePairs, setImagePairs] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch image pairs for the selected date
  const fetchImagePairs = useCallback(async () => {
    try {
      const adjustedDate = new Date(selectedDate);
      adjustedDate.setUTCHours(5, 0, 0, 0);
      const formattedDate = adjustedDate.toISOString().split("T")[0];

      console.log('Fetching pairs for date:', formattedDate);
      const response = await axiosInstance.get(`/admin/get-image-pairs-by-date/${formattedDate}`);
      console.log('Received pairs:', response.data);

      if (response.data) {
        setImagePairs(response.data.pairs || []);
        setPendingImages(response.data.pendingHumanImages || []);
        setMessage('');
      } else {
        setImagePairs([]);
        setPendingImages([]);
        setMessage('No pairs scheduled for this date.');
      }
    } catch (error) {
      console.error('Error fetching image pairs:', error);
      setError('Failed to fetch image pairs. Please try again.');
      setImagePairs([]);
      setPendingImages([]);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchImagePairs();
  }, [fetchImagePairs]);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setMessage('');
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const handleRegenerateAI = async (pairId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const adjustedDate = new Date(selectedDate);
      adjustedDate.setUTCHours(5, 0, 0, 0);
      const formattedDate = adjustedDate.toISOString().split("T")[0];
      
      console.log('Regenerating AI image for:', { pairId, formattedDate });
      const response = await axiosInstance.post('/admin/regenerate-ai-image', {
        pairId,
        scheduledDate: formattedDate
      });
      console.log('Regenerate response:', response.data);

      // Update the image pairs with the new AI image
      setImagePairs(prevPairs => 
        prevPairs.map(pair => 
          pair._id === pairId 
            ? { ...pair, aiImageURL: response.data.newAiImageUrl }
            : pair
        )
      );

      setMessage('AI image regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating AI image:', error);
      setError(error.response?.data?.error || 'Failed to regenerate AI image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePair = async (pairId) => {
    if (!window.confirm('Are you sure you want to delete this pair? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const adjustedDate = new Date(selectedDate);
      adjustedDate.setUTCHours(5, 0, 0, 0);
      const formattedDate = adjustedDate.toISOString().split("T")[0];

      console.log('Deleting pair:', { pairId, formattedDate });
      await axiosInstance.delete('/admin/delete-pair', {
        data: {
          pairId,
          scheduledDate: formattedDate
        }
      });

      // Remove the deleted pair from the state
      setImagePairs(prevPairs => prevPairs.filter(pair => pair._id !== pairId));
      setMessage('Image pair deleted successfully!');
    } catch (error) {
      console.error('Error deleting pair:', error);
      setError(error.response?.data?.error || 'Failed to delete image pair');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="manage-day-container">
      <h1>Manage Daily Pairs</h1>
      
      <div className="info-box">
        <p>View and manage automatically scheduled image pairs:</p>
        <ul>
          <li>Select a date to view its scheduled pairs</li>
          <li>Click on any image to enlarge it</li>
          <li>Use the regenerate button to create a new AI variation</li>
          <li>Use the delete button to remove a pair completely</li>
        </ul>
      </div>

      <div className="calendar-container">
        <Calendar onChange={handleDateClick} value={selectedDate} />
      </div>

      <div className="date-header">
        <h2>Pairs for {selectedDate.toDateString()}</h2>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="info-message">{message}</div>}

      {/* Display completed pairs */}
      <div className="existing-image-pairs-container">
        <h3>Completed Pairs</h3>
        {imagePairs.length === 0 ? (
          <p className="no-pairs-message">No completed pairs for this date.</p>
        ) : (
          <div className="existing-pairs-wrapper">
            {imagePairs.map((pair, index) => (
              <div key={pair._id || index} className="existing-pair-container">
                <h4>Pair #{index + 1}</h4>
                <div className="existing-images">
                  <div className="image-wrapper">
                    <img 
                      src={pair.humanImageURL} 
                      alt="Human Art" 
                      className="image-preview"
                      onClick={() => handleImageClick(pair.humanImageURL)}
                    />
                    <p>Human</p>
                  </div>
                  <div className="image-wrapper">
                    <img 
                      src={pair.aiImageURL} 
                      alt="AI Art" 
                      className="image-preview"
                      onClick={() => handleImageClick(pair.aiImageURL)}
                    />
                    <p>AI</p>
                  </div>
                </div>
                <div className="pair-actions">
                  <button 
                    className="regenerate-button"
                    onClick={() => handleRegenerateAI(pair._id)}
                    disabled={isLoading}
                  >
                    <span className="regenerate-icon">↻</span>
                    Regenerate AI
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => handleDeletePair(pair._id)}
                    disabled={isLoading}
                  >
                    Delete Pair
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Display pending human images */}
      <div className="pending-images-container">
        <h3>Pending Human Images</h3>
        <p className="info-text">These images are queued for AI pair generation</p>
        <div className="pending-images-grid">
          {pendingImages.map((image, index) => (
            <div key={index} className="pending-image-wrapper">
              <img 
                src={image.url} 
                alt={`Pending Human Art ${index + 1}`} 
                className="image-preview"
                onClick={() => handleImageClick(image.url)}
              />
              <p>Uploaded {new Date(image.uploadedAt).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

export default ManageDay;