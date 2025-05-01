import React from 'react';
import { useNavigate } from 'react-router-dom';

// Main dashboard component for admin navigation
const AdminOverview = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-overview">
      <h1>Admin Dashboard</h1>
      {/* Navigation buttons for different admin sections */}
      <button onClick={() => navigate('/manage-day')}>Manage Images</button>
      <button onClick={() => navigate('/manage-users')}>Manage Users</button>
    </div>
  );
};

export default AdminOverview;
