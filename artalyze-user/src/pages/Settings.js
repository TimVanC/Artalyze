import React from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login'); // Redirect to the login screen
  };  

  return (
    <div>
      <h1>Settings</h1>
      <button onClick={handleLogout}>Log Out</button>
    </div>
  );
};

export default Settings;
