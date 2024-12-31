import React from 'react';

const ErrorBoundary = ({ children, error }) => {
  if (error) {
    return <div className="error-boundary">Error: {error}</div>;
  }
  return children;
};

export default ErrorBoundary;
