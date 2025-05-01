// A reusable component for handling file drops
import React from 'react';
import { useDropzone } from 'react-dropzone';

// Component that renders a dropzone for image uploads
const DropzoneComponent = ({ onDrop, label, currentFile }) => {
  // Configure the dropzone to accept image files
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: 'image/*',
  });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      {currentFile ? (
        <p>{currentFile.name}</p>
      ) : (
        <p>{label}</p>
      )}
    </div>
  );
};

export default DropzoneComponent;
