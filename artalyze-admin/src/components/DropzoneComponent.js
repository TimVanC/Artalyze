// DropzoneComponent.js

import React from 'react';
import { useDropzone } from 'react-dropzone';

const DropzoneComponent = ({ onDrop, label, currentFile }) => {
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
