import React, { useState, useEffect, useRef } from 'react';
import DropzoneComponent from './DropzoneComponent';
import axiosInstance from '../axiosInstance';
import { v4 as uuidv4 } from 'uuid';
import { STAGING_BASE_URL } from '../config';
import './Upload.css';

const Upload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const eventSourceRef = useRef(null);

  // Cleanup function for SSE connection
  const cleanupSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => cleanupSSE();
  }, []);

  const onDrop = (acceptedFiles) => {
    // Filter out any non-image files
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== acceptedFiles.length) {
      alert('Some files were skipped because they are not images.');
    }
    setUploadedFiles(prev => [...prev, ...imageFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const setupSSE = (sessionId) => {
    // Clean up any existing connection
    cleanupSSE();

    const token = localStorage.getItem('adminToken');
    if (!token) {
      console.error('No admin token found');
      setUploadStatus('Authentication error. Please log in again.');
      return null;
    }

    try {
      const url = new URL(`${STAGING_BASE_URL}/admin/progress-updates/${sessionId}`);
      url.searchParams.append('token', token); // Send raw token
      
      console.log('Establishing SSE connection:', url.toString());
      
      const eventSource = new EventSource(url.toString());

      // Connection opened
      eventSource.onopen = (event) => {
        console.log('SSE connection opened successfully');
      };

      // Message received
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE message received:', data);

          // Ignore heartbeat messages
          if (data.type === 'heartbeat') {
            console.log('Heartbeat received');
            return;
          }

          // Update status message
          setUploadStatus(data.message);
          
          // Update status message styling
          const statusElement = document.querySelector('.status-message');
          if (statusElement) {
            statusElement.className = `status-message ${data.type || 'info'}`;
            
            // Scroll success messages into view
            if (data.type === 'success') {
              statusElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      // Error handling
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('SSE connection closed');
          return;
        }

        // Only show error and attempt reconnect if we're still uploading
        if (isUploading) {
          setUploadStatus('Connection error. Retrying...');
          
          // Close the errored connection
          eventSource.close();
          
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (isUploading) {
              console.log('Attempting to reconnect...');
              setupSSE(sessionId);
            }
          }, 3000);
        }
      };

      // Store the EventSource instance
      eventSourceRef.current = eventSource;
      return eventSource;

    } catch (error) {
      console.error('Error setting up SSE:', error);
      setUploadStatus('Failed to establish connection. Please try again.');
      return null;
    }
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      setUploadStatus('Please add some images first.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Starting upload process...');

    try {
      // Upload each image
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const sessionId = uuidv4();
        const formData = new FormData();
        formData.append('humanImage', file);
        formData.append('sessionId', sessionId);
        formData.append('scheduledDate', '');
        formData.append('totalImages', uploadedFiles.length.toString());
        formData.append('currentImageIndex', (i + 1).toString());

        // Set up SSE connection for this upload
        const eventSource = setupSSE(sessionId);
        if (!eventSource) {
          throw new Error('Failed to establish SSE connection');
        }

        try {
          setUploadStatus(`Processing image ${i + 1} of ${uploadedFiles.length}...`);
          const response = await axiosInstance.post('/admin/upload-human-image', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          // Wait a bit before closing the connection
          setTimeout(() => {
            if (eventSourceRef.current) {
              console.log('Closing SSE connection');
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          }, 2000);

          console.log('Upload response:', response.data);
        } catch (error) {
          console.error('Upload error:', error);
          setUploadStatus(`Failed to upload ${file.name}. Continuing with remaining files...`);
        }
      }

      setUploadStatus(`✨ Successfully uploaded ${uploadedFiles.length} images! They will be automatically paired with AI images and scheduled.`);
      setUploadedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      // Final cleanup
      setTimeout(cleanupSSE, 2000);
    }
  };

  return (
    <div className="upload-page-container">
      <h1>Bulk Upload Human Images</h1>
      
      <div className="info-box">
        <h2>How it works:</h2>
        <ul>
          <li>Upload multiple human artwork images at once</li>
          <li>Each image goes through 5 steps of processing:</li>
          <li>1. Image optimization</li>
          <li>2. Cloud storage upload</li>
          <li>3. Style analysis</li>
          <li>4. AI prompt engineering</li>
          <li>5. AI image generation (30-45 seconds)</li>
        </ul>
      </div>

      <div className="bulk-dropzone-container">
        <DropzoneComponent
          onDrop={onDrop}
          label="Drop multiple images here or click to select"
          multiple={true}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-preview">
          <h3>Selected Images ({uploadedFiles.length})</h3>
          <div className="preview-grid">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="preview-item">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="preview-image"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="remove-button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="upload-button"
        onClick={handleUpload}
        disabled={isUploading || uploadedFiles.length === 0}
      >
        {isUploading ? 'Uploading...' : 'Upload All Images'}
      </button>

      {uploadStatus && (
        <div className={`status-message ${uploadStatus.includes('Success') ? 'success' : uploadStatus.includes('Error') || uploadStatus.includes('Failed') ? 'error' : 'info'}`}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
};

export default Upload; 