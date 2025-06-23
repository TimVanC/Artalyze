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
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPairs, setLoadingPairs] = useState(new Set()); // Track individual pair loading states
  const [bulkLoading, setBulkLoading] = useState(false); // Track bulk operation loading
  const [selectedPairs, setSelectedPairs] = useState(new Set()); // Track selected pairs for bulk operations
  const [pairCounts, setPairCounts] = useState({});

  // Fetch image pairs for the selected date
  const fetchImagePairs = async (date) => {
    console.log('Fetching pairs for date:', date.toISOString().slice(0, 10));
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/admin/image-pairs/${date.toISOString().slice(0, 10)}`);
      console.log('Pairs received:', response.data);
      setImagePairs(response.data);
      setSelectedPairs(new Set()); // Reset selections when changing dates
    } catch (err) {
      console.error('Error fetching image pairs:', err);
      setError('Failed to fetch image pairs');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch pair counts for all days
  const fetchPairCounts = async () => {
    try {
      console.log('Fetching pair counts...');
      const response = await axiosInstance.get('/admin/pair-counts');
      console.log('Pair counts received:', response.data);
      setPairCounts(response.data);
    } catch (err) {
      console.error('Error fetching pair counts:', err);
      // Don't set error state for pair counts, just log it
    }
  };

  // Load pair counts only once on component mount
  useEffect(() => {
    fetchPairCounts();
  }, []); // Empty dependency array - only run once

  useEffect(() => {
    if (selectedDate) {
      fetchImagePairs(selectedDate);
    }
  }, [selectedDate]);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setMessage('');
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  // Handle individual pair selection
  const handlePairSelection = (pairId) => {
    setSelectedPairs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pairId)) {
        newSet.delete(pairId);
      } else {
        newSet.add(pairId);
      }
      return newSet;
    });
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedPairs.size === imagePairs.length) {
      // If all are selected, deselect all
      setSelectedPairs(new Set());
    } else {
      // Select all
      const allPairIds = imagePairs.map(pair => pair._id);
      setSelectedPairs(new Set(allPairIds));
    }
  };

  const handleRegenerateAI = async (pairId) => {
    setLoadingPairs(prev => new Set(prev).add(pairId));
    try {
      const response = await axiosInstance.post(`/admin/regenerate-ai-image`, {
        scheduledDate: selectedDate.toISOString().split('T')[0],
        pairId: pairId
      });
      
      // Update the specific pair in the list
      setImagePairs(prevPairs => 
        prevPairs.map(pair => 
          pair._id === pairId 
            ? { ...pair, aiImageURL: response.data.aiImageURL }
            : pair
        )
      );
      
      setMessage('AI image regenerated successfully');
      fetchPairCounts(); // Refresh pair counts
    } catch (error) {
      setError('Failed to regenerate AI image');
      console.error('Error regenerating AI image:', error);
    } finally {
      setLoadingPairs(prev => {
        const newSet = new Set(prev);
        newSet.delete(pairId);
        return newSet;
      });
    }
  };

  const handleDeletePair = async (pairId) => {
    setLoadingPairs(prev => new Set(prev).add(pairId));
    try {
      await axiosInstance.delete(`/admin/delete-pair`, {
        data: {
          scheduledDate: selectedDate.toISOString().split('T')[0],
          pairId: pairId
        }
      });
      
      // Remove the pair from the list
      setImagePairs(prevPairs => prevPairs.filter(pair => pair._id !== pairId));
      setSelectedPairs(prev => {
        const newSet = new Set(prev);
        newSet.delete(pairId);
        return newSet;
      });
      
      setMessage('Image pair deleted successfully');
      fetchPairCounts(); // Refresh pair counts
    } catch (error) {
      setError('Failed to delete image pair');
      console.error('Error deleting image pair:', error);
    } finally {
      setLoadingPairs(prev => {
        const newSet = new Set(prev);
        newSet.delete(pairId);
        return newSet;
      });
    }
  };

  const handleBulkRegenerate = async () => {
    if (selectedPairs.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to regenerate ${selectedPairs.size} AI images?`)) {
      return;
    }

    setBulkLoading(true);
    const promises = Array.from(selectedPairs).map(pairId => handleRegenerateAI(pairId));
    
    try {
      await Promise.all(promises);
      setMessage(`Successfully regenerated ${selectedPairs.size} AI images!`);
      setSelectedPairs(new Set());
      fetchPairCounts(); // Refresh pair counts
    } catch (error) {
      console.error('Error bulk regenerating AI images:', error);
      setError(error.response?.data?.error || 'Failed to bulk regenerate AI images');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPairs.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedPairs.size} image pairs? This action cannot be undone.`)) {
      return;
    }

    setBulkLoading(true);
    const promises = Array.from(selectedPairs).map(pairId => handleDeletePair(pairId));
    
    try {
      await Promise.all(promises);
      setMessage(`Successfully deleted ${selectedPairs.size} image pairs!`);
      setSelectedPairs(new Set());
      fetchPairCounts(); // Refresh pair counts
    } catch (error) {
      console.error('Error bulk deleting pairs:', error);
      setError(error.response?.data?.error || 'Failed to bulk delete image pairs');
    } finally {
      setBulkLoading(false);
    }
  };

  // Function to get tile class based on pair count
  const getTileClass = ({ date, view }) => {
    if (view !== 'month') return '';
    // Always use UTC YYYY-MM-DD
    const dateString = date.toISOString().slice(0, 10);
    const selectedDateString = selectedDate.toISOString().slice(0, 10);
    
    // Check if this is the currently selected date
    if (dateString === selectedDateString) {
      return 'calendar-day-selected';
    }
    
    const count = pairCounts[dateString] || 0;
    if (count >= 5) return 'calendar-day-complete';
    if (count >= 1) return 'calendar-day-partial';
    return 'calendar-day-empty';
  };

  return (
    <div className="manage-day-container">
      <div className="page-header">
        <h1>Manage Daily Image Pairs</h1>
        <div className="instructions">
          <span>Select a date to view pairs • Click images to enlarge • Use checkboxes for bulk operations • Regenerate AI variations • Delete pairs</span>
        </div>
      </div>

      <div className="calendar-bulk-container">
        <div className="calendar-section">
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            className="react-calendar"
            tileClassName={getTileClass}
          />
        </div>

        {selectedDate && (
          <div className="bulk-actions">
            <div className="selection-controls">
              <button 
                className="select-all-button"
                onClick={handleSelectAll}
                disabled={bulkLoading || loadingPairs.size > 0}
              >
                {selectedPairs.size === imagePairs.length && imagePairs.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              <span className="selection-count">
                {selectedPairs.size} of {imagePairs.length} selected
              </span>
            </div>
            <div className="bulk-operation-buttons">
              <button 
                className="bulk-regenerate-button"
                onClick={handleBulkRegenerate}
                disabled={bulkLoading || loadingPairs.size > 0 || selectedPairs.size === 0}
              >
                {bulkLoading ? (
                  <>
                    <span className="spinner"></span>
                    Regenerating...
                  </>
                ) : (
                  'Regenerate Selected'
                )}
              </button>
              <button 
                className="bulk-delete-button"
                onClick={handleBulkDelete}
                disabled={bulkLoading || loadingPairs.size > 0 || selectedPairs.size === 0}
              >
                {bulkLoading ? (
                  <>
                    <span className="spinner"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Selected'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedDate && (
        <div className="date-header">
          <h2>Pairs for {selectedDate.toDateString()}</h2>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {message && <div className="info-message">{message}</div>}

      {/* Display completed pairs */}
      <div className="existing-image-pairs-container">
        <h3>Completed Pairs</h3>
        {imagePairs.length === 0 ? (
          <p className="no-pairs-message">No completed pairs for this date.</p>
        ) : (
          <div className="existing-pairs-wrapper">
            {imagePairs.map((pair, index) => {
              const isPairLoading = loadingPairs.has(pair._id);
              const isSelected = selectedPairs.has(pair._id);
              return (
                <div key={pair._id || index} className={`existing-pair-container ${isSelected ? 'selected' : ''}`}>
                  <div className="pair-header">
                    <h4>Pair #{index + 1}</h4>
                    <label className="pair-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePairSelection(pair._id)}
                        disabled={isPairLoading || bulkLoading}
                      />
                      <span className="checkmark"></span>
                    </label>
                  </div>
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
                        className={`image-preview ${isPairLoading ? 'loading' : ''}`}
                        onClick={() => handleImageClick(pair.aiImageURL)}
                      />
                      {isPairLoading && (
                        <div className="image-loader">
                          <div className="spinner"></div>
                          <p>Regenerating...</p>
                        </div>
                      )}
                      <p>AI</p>
                    </div>
                  </div>
                  <div className="pair-actions">
                    <button 
                      className="regenerate-button"
                      onClick={() => handleRegenerateAI(pair._id)}
                      disabled={isPairLoading || bulkLoading}
                    >
                      {isPairLoading ? (
                        <>
                          <span className="spinner"></span>
                          Regenerating...
                        </>
                      ) : (
                        'Regenerate AI'
                      )}
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeletePair(pair._id)}
                      disabled={isPairLoading || bulkLoading}
                    >
                      {isPairLoading ? (
                        <>
                          <span className="spinner"></span>
                          Deleting...
                        </>
                      ) : (
                        'Delete Pair'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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