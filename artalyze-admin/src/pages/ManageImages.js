import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ManageImages.css'; // Assuming this CSS is already set up for styling

const ManageImages = () => {
  const navigate = useNavigate();

  const handleManageCalendar = () => {
    navigate('/manage-day');
  };

  return (
    <div className="manage-images-dashboard">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-actions">
        <button className="manage-calendar-button" onClick={handleManageCalendar}>
          Manage Calendar
        </button>
        {/* Placeholder for other dashboard actions */}
      </div>
    </div>
  );
};

export default ManageImages;
