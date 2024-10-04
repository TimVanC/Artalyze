import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import logo from '../assets/images/artalyze-logo.png';

const Home = () => {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    navigate('/game');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="home-container">
      <img src={logo} alt="Artalyze Logo" className="home-logo" />
      <h1 className="home-title">Artalyze</h1>
      <p className="home-description">Can you spot the human masterpiece?</p>
      <button className="play-button" onClick={handlePlayClick}>Play</button>
      <button className="login-button" onClick={handleLoginClick}>Log In</button>
      <p className="date">September 20, 2024</p>
      <p className="number">No. 1</p>
      <p className="author">By Tim Van Cauwenberge</p>
    </div>
  );
};

export default Home;
