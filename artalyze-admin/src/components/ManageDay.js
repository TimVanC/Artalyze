import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import calendar styles
import DropzoneComponent from './DropzoneComponent';
import axios from 'axios';
import './ManageDay.css';

const ManageDay = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [imagePairs, setImagePairs] = useState([
    { human: null, ai: null },
    { human: null, ai: null },
    { human: null, ai: null },
    { human: null, ai: null },
    { human: null, ai: null },
  ]);
  const [uploadMessage, setUploadMessage] = useState('');
  const [existingImagePairs, setExistingImagePairs] = useState([]);

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  // Fetch image pairs for the selected date
  useEffect(() => {
    if (selectedDate) {
      fetchImagePairsByDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchImagePairsByDate = async (date) => {
    try {
      const formattedDate = date.toLocaleDateString('en-CA'); // Formats as yyyy-mm-dd
      const response = await axios.get(`http://localhost:5000/api/admin/get-image-pairs-by-date/${formattedDate}`);
      setExistingImagePairs(response.data.pairs || []); // Updated to extract `pairs` from the document
    } catch (error) {
      console.error('Error fetching image pairs:', error);
      setExistingImagePairs([]); // Ensure no image pairs are shown if there's an error
    }
  };
  

  const onDrop = (acceptedFiles, index, type) => {
    const updatedPairs = [...imagePairs];
    if (type === 'human') {
      updatedPairs[index].human = acceptedFiles[0];
    } else if (type === 'ai') {
      updatedPairs[index].ai = acceptedFiles[0];
    }
    setImagePairs(updatedPairs);
  };

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
        if (pair.human && pair.ai) {
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
      fetchImagePairsByDate(selectedDate); // Refresh the image pairs
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
            {existingImagePairs.length === 0 && <p>No existing image pairs found for this date.</p>}
            <div className="existing-pairs-wrapper">
              {existingImagePairs.map((pair, index) => (
                <div key={index} className="existing-pair-container">
                  <h4>Pair #{index + 1}</h4>
                  <div className="existing-images">
                    <div className="image-wrapper">
                      <img src={pair.humanImageURL} alt="Human Art" className="image-preview" />
                    </div>
                    <div className="image-wrapper">
                      <img src={pair.aiImageURL} alt="AI Art" className="image-preview" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dropzones for uploading new image pairs */}
          <div className="image-pairs-container">
            {imagePairs.map((pair, index) => (
              <div key={index} className={`pair-container ${index < 4 ? 'half-width' : 'full-width'}`}>
                <h3>Pair {index + 1}</h3>
                <DropzoneComponent
                  onDrop={(files) => onDrop(files, index, 'human')}
                  label="Drop Human Image"
                  currentFile={pair.human}
                />
                <DropzoneComponent
                  onDrop={(files) => onDrop(files, index, 'ai')}
                  label="Drop AI Image"
                  currentFile={pair.ai}
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
