// Component for handling image file uploads using react-dropzone
import React from 'react';
import { useDropzone } from 'react-dropzone';

// Reusable dropzone component for image uploads
const DropzoneComponent = ({ onDrop, label, currentFile }) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: 'image/*',
  });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      {/* Display current file name or upload prompt */}
      {currentFile ? (
        <p>{currentFile.name}</p>
      ) : (
        <p>{label}</p>
      )}
    </div>
  );
};

export default DropzoneComponent;
