import React, { useState, useRef } from 'react';
import { Box, Button, CircularProgress, Typography, Paper, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { v4 as uuidv4 } from 'uuid';

const ImageUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadImage(file);
    }
  };

  const uploadImage = async (file) => {
    // Reset states
    setUploading(true);
    setProgress('');
    setError(null);
    setSuccess(false);

    // Generate session ID
    const sessionId = uuidv4();

    // Connect to SSE endpoint
    eventSourceRef.current = new EventSource(`/api/admin/progress-updates/${sessionId}`);
    
    eventSourceRef.current.onmessage = (event) => {
      const { message } = JSON.parse(event.data);
      setProgress(message);
    };

    eventSourceRef.current.onerror = () => {
      setError('Lost connection to server');
      cleanup();
    };

    // Prepare form data
    const formData = new FormData();
    formData.append('humanImage', file);
    formData.append('sessionId', sessionId);

    try {
      const response = await fetch('/api/admin/upload-human-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setSuccess(true);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setError(error.message);
    } finally {
      cleanup();
    }
  };

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setUploading(false);
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        maxWidth: 600, 
        mx: 'auto', 
        mt: 4 
      }}
    >
      <Typography variant="h5" gutterBottom>
        Upload Human Image
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload a human-created artwork. The system will automatically:
        • Generate an AI description
        • Create a matching AI artwork
        • Schedule it for the next available day
      </Typography>

      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          mb: 2,
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          hidden
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography>
          Click or drag an image here to upload
        </Typography>
      </Box>

      {uploading && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography color="text.secondary">
            {progress}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Image uploaded and processed successfully!
        </Alert>
      )}
    </Paper>
  );
};

export default ImageUploader; 