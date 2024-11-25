import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import calendar styles
import DropzoneComponent from './DropzoneComponent';
import axios from 'axios';
import axiosInstance from '../axiosInstance';
import './ManageDay.css';

const ManageDay = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [imagePairs, setImagePairs] = useState([]); // State to store the fetched image pairs
  const [error, setError] = useState(null); // State for managing error messages
  const [uploadMessage, setUploadMessage] = useState(""); // State for managing upload messages

  useEffect(() => {
    fetchImagePairs();
  }, [selectedDate]);

  // Function to fetch image pairs for the selected date
  const fetchImagePairs = async () => {
    try {
      // Format the selectedDate to ensure it matches the expected format in the backend
      const formattedDate = format(selectedDate, "yyyy-MM-dd'T'04:00:00.000XXX");
      console.log("Formatted Date for Fetch:", formattedDate);

      const response = await axiosInstance.get(`/admin/get-image-pairs-by-date/${formattedDate}`);
      console.log("Fetched Image Pairs:", response.data);

      if (response.data && response.data.pairs) {
        setImagePairs(response.data.pairs); // Set state with the fetched image pairs
      } else {
        console.warn("No image pairs available for the selected date.");
        setImagePairs([]); // Set an empty array if no pairs are found
      }
    } catch (error) {
      console.error("Error fetching image pairs:", error);
      setError("Failed to load image pairs. Please try again later.");
      setImagePairs([]); // Set an empty array in case of an error
    }
  };

  // Function to handle date selection from the calendar
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setUploadMessage(""); // Clear any existing upload messages when a new date is selected
  };

  const onDrop = (acceptedFiles, index, type) => {
    const updatedPairs = [...imagePairs];
    if (!updatedPairs[index]) {
      updatedPairs[index] = {}; // Ensure the pair object exists
    }

    if (type === 'human') {
      updatedPairs[index].human = acceptedFiles[0];
    } else if (type === 'ai') {
      updatedPairs[index].ai = acceptedFiles[0];
    }
    setImagePairs(updatedPairs);
  };

  // Function to handle the image upload
  const handleUpload = async () => {
    if (!selectedDate) {
      setUploadMessage('Please select a date first.');
      return;
    }

    try {
      // Adjust the date to 12:00 AM EST
      const date = new Date(selectedDate);
      const isDaylightSaving = date.getMonth() >= 2 && date.getMonth() <= 10; // DST
      if (isDaylightSaving) {
        date.setUTCHours(4, 0, 0, 0); // EDT
      } else {
        date.setUTCHours(5, 0, 0, 0); // EST
      }

      for (let i = 0; i < imagePairs.length; i++) {
        const pair = imagePairs[i];
        if (pair && pair.human && pair.ai) {
          const formData = new FormData();
          formData.append('humanImage', pair.human);
          formData.append('aiImage', pair.ai);
          formData.append('scheduledDate', date.toISOString()); // Format to match backend expectation
          formData.append('pairIndex', i);

          await axios.post('http://localhost:5000/api/admin/upload-image-pair', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
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

          {/* Display existing image pairs for the selected date */}
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

          {/* Dropzones for uploading new image pairs */}
          <div className="image-pairs-container">
            {[...Array(5)].map((_, index) => (
              <div key={index} className={`pair-container ${index < 4 ? 'half-width' : 'full-width'}`}>
                <h3>Pair {index + 1}</h3>
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
