import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { BASE_URL } from "../config";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import calendar styles
import DropzoneComponent from './DropzoneComponent';
import axios from 'axios';
import axiosInstance from '../axiosInstance';
import './ManageDay.css';

// Component for managing image pairs for a specific date
const ManageDay = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [imagePairs, setImagePairs] = useState([]); // State to store the fetched image pairs
  const [error, setError] = useState(null); // State for managing error messages
  const [uploadMessage, setUploadMessage] = useState(''); // State for managing upload messages

  // Fetch image pairs for the selected date
  const fetchImagePairs = useCallback(async () => {
    try {
      const adjustedDate = new Date(selectedDate);
      adjustedDate.setUTCHours(5, 0, 0, 0); // Convert to EST/EDT format
      const formattedDate = adjustedDate.toISOString().split("T")[0]; // Ensure only YYYY-MM-DD

      console.log('Fetching Image Pairs for:', formattedDate);
      const response = await axiosInstance.get(`/admin/get-image-pairs-by-date/${formattedDate}`);
      
      if (response.data && response.data.pairs) {
        setImagePairs(response.data.pairs);
      } else {
        setImagePairs([]);
      }
    } catch (error) {
      console.error('Error fetching image pairs:', error);
      setImagePairs([]);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchImagePairs();
  }, [fetchImagePairs]); // Runs only when `fetchImagePairs` changes

  // Handle date selection from calendar
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setUploadMessage(''); // Clear any existing upload messages when a new date is selected
  };

  // Handle file drops for both human and AI images
  const onDrop = (acceptedFiles, index, type) => {
    const updatedPairs = [...imagePairs];
    if (!updatedPairs[index]) {
      updatedPairs[index] = {}; // Ensure the pair object exists
    }

    const file = acceptedFiles[0];
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    if (type === 'human') {
      updatedPairs[index].human = file;
    } else if (type === 'ai') {
      updatedPairs[index].ai = file;
    }
    setImagePairs(updatedPairs);
  };

  // Upload image pairs to the server
  const handleUpload = async () => {
    if (!selectedDate) {
      setUploadMessage('Please select a date first.');
      return;
    }
  
    try {
      const date = new Date(selectedDate);
      const isDaylightSaving = date.getMonth() >= 2 && date.getMonth() <= 10; // DST
      date.setUTCHours(isDaylightSaving ? 4 : 5, 0, 0, 0); // Adjust EST/EDT
  
      for (let i = 0; i < imagePairs.length; i++) {
        const pair = imagePairs[i];
        if (pair && pair.human && pair.ai) {
          const formData = new FormData();
          formData.append('humanImage', pair.human);
          formData.append('aiImage', pair.ai);
          formData.append('scheduledDate', date.toISOString());
          formData.append('pairIndex', i);
  
          await new Promise((resolve) => setTimeout(resolve, 200)); // Delay between requests
  
          await axios.post(
            "https://artalyze-backend-production.up.railway.app/api/admin/upload-image-pair", 
            formData, 
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }
      }
  
      setUploadMessage('All images uploaded successfully');
      fetchImagePairs(); // Refresh the image pairs
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage('Failed to upload some or all images. Please try again.');
    }
  };
  

  return (
    <div className="manage-day-container">
      <h1>Manage Day</h1>
      <div className="calendar-container">
        <Calendar onClickDay={handleDateClick} />
      </div>
      {selectedDate && (
        <>
          <h2>Manage Image Pairs for {selectedDate.toDateString()}</h2>

          {error && <p className="error-message">{error}</p>}

          {/* Existing Image Pairs Section */}
          <div className="existing-image-pairs-container">
            <h3>Existing Image Pairs for {selectedDate.toDateString()}</h3>
            {imagePairs.length === 0 && <p>No existing image pairs found for this date.</p>}
            <div className="existing-pairs-wrapper">
              {imagePairs.map((pair, index) => (
                <div key={index} className="existing-pair-container">
                  <h4>Pair #{index + 1}</h4>
                  <div className="existing-images">
                    <div className="image-wrapper">
                      {pair.humanImageURL ? (
                        <img src={pair.humanImageURL} alt="Human Art" className="image-preview" />
                      ) : (
                        <p>No Human Image</p>
                      )}
                    </div>
                    <div className="image-wrapper">
                      {pair.aiImageURL ? (
                        <img src={pair.aiImageURL} alt="AI Art" className="image-preview" />
                      ) : (
                        <p>No AI Image</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dropzones for Uploading */}
          <div className="image-pairs-container">
            {[...Array(5)].map((_, index) => (
              <div key={index} className={`pair-container ${index < 4 ? 'half-width' : 'full-width'}`}>
                <h3>Pair {index + 1}</h3>
                <div className="dropzone-container">
                  <DropzoneComponent
                    onDrop={(files) => onDrop(files, index, 'human')}
                    label="Drop Human Image"
                    currentFile={imagePairs[index]?.human}
                  />
                  <DropzoneComponent
                    onDrop={(files) => onDrop(files, index, 'ai')}
                    label="Drop AI Image"
                    currentFile={imagePairs[index]?.ai}
                  />
                </div>
              </div>
            ))}
          </div>

          <button className="upload-button" onClick={handleUpload}>
            Upload Pairs
          </button>
          {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
        </>
      )}
    </div>
  );
};

export default ManageDay;