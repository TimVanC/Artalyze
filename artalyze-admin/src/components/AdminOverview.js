import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminOverview = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-overview">
      <h1>Admin Dashboard</h1>
      <button onClick={() => navigate('/manage-day')}>Manage Images</button>
      <button onClick={() => navigate('/manage-users')}>Manage Users</button>
    </div>
  );
};

export default AdminOverview;
