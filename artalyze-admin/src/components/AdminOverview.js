import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminOverview.css';

// The main dashboard view for administrators
const AdminOverview = () => {
  // Hook for programmatic navigation
  const navigate = useNavigate();

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.reload();
  };

  return (
    <div className="admin-overview">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
      <div className="admin-actions">
        <div className="action-group">
          <h2>Image Management</h2>
          <button onClick={() => navigate('/upload')} className="action-button">
            Upload Images
          </button>
          <button onClick={() => navigate('/manage-day')} className="action-button">
            View Daily Pairs
          </button>
        </div>

        <div className="action-group">
          <h2>User Management</h2>
          <button onClick={() => navigate('/manage-users')} className="action-button">
            Manage Users
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
