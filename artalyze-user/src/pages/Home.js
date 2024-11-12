import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import logo from '../assets/images/artalyze-logo.png';

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for auth token on component mount
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token); // Update state based on token presence
  }, []);

  const handlePlayClick = () => {
    navigate('/game'); // Directly navigate to game screen, regardless of login status
  };

  const handleLoginClick = () => {
    navigate('/login'); // Navigate to login page
  };

  return (
    <div className="home-container">
      <img src={logo} alt="Artalyze Logo" className="home-logo" />
      <h1 className="home-title">Artalyze</h1>
      <p className="home-description">Can you spot the human masterpiece?</p>
      <button className="play-button" onClick={handlePlayClick}>Play</button>
      {!isAuthenticated && (
        <button className="login-button" onClick={handleLoginClick}>Log In</button>
      )}
      <div className="text-container">
        <p className="date">September 20, 2024</p>
        <p className="puzzle-number">No. 1</p>
        <p className="author">By Tim Van Cauwenberge</p>
      </div>
    </div>
  );
};

export default Home;
