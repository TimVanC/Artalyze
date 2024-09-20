import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageImages = () => {
  const [humanImages, setHumanImages] = useState([]);
  const [aiImages, setAiImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);

  useEffect(() => {
    // Fetch uploaded images
    const fetchImages = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/images/list');
        console.log('Response data:', res.data);  // Add this log to see the response
        setUploadedImages(res.data.images);
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };
    fetchImages();
  }, []);
  

  const handleHumanImagesChange = (e) => {
    setHumanImages(e.target.files);
  };

  const handleAIImagesChange = (e) => {
    setAiImages(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    for (let i = 0; i < humanImages.length; i++) {
      formData.append('humanImages', humanImages[i]);
    }
    for (let i = 0; i < aiImages.length; i++) {
      formData.append('aiImages', aiImages[i]);
    }
  
    try {
      await axios.post('http://localhost:5000/api/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Images uploaded successfully');
    } catch (error) {
      console.error('Error uploading images:', error);
    }
  };
  

  return (
    <div>
      <h1>Manage Images</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Upload Human Images:</label>
          <input type="file" multiple onChange={handleHumanImagesChange} />
        </div>
        <div>
          <label>Upload AI Images:</label>
          <input type="file" multiple onChange={handleAIImagesChange} />
        </div>
        <button type="submit">Upload Images</button>
      </form>

      <h2>Uploaded Images</h2>
      <div>
        {uploadedImages.length === 0 ? (
          <p>No images uploaded yet.</p>
        ) : (
          <ul>
            {uploadedImages.map((image, index) => (
              <li key={index}>
                <img src={`http://localhost:5000/uploads/${image}`} alt={image} width="100" />
                <p>{image}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ManageImages;
