import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import logo from '../assets/images/artalyze-logo.png';
import axiosInstance from '../axiosInstance';
import { calculatePuzzleNumber } from '../utils/puzzleUtils'; // Import the shared utility

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [date, setDate] = useState('');
  const [puzzleNumber, setPuzzleNumber] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);

    const fetchPlayStatus = async () => {
      if (token) {
        try {
          const response = await axiosInstance.get('/game/check-today-status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setHasPlayedToday(response.data.hasPlayedToday);
        } catch (error) {
          console.error('Error fetching play status:', error);
        }
      }
    };

    const updateDateAndPuzzle = () => {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      setDate(formattedDate);

      // Use the utility to get the puzzle number
      const puzzleNo = calculatePuzzleNumber();
      setPuzzleNumber(puzzleNo);
    };

    fetchPlayStatus();
    updateDateAndPuzzle();
  }, []);

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
      <button
        className="play-button"
        onClick={handlePlayClick}
      >
        {hasPlayedToday ? 'See Stats' : 'Play'}
      </button>
      {!isAuthenticated && (
        <button className="login-button" onClick={handleLoginClick}>
          Log In
        </button>
      )}
      <div className="text-container">
        <p className="date">{date}</p>
        <p className="puzzle-number">No. {puzzleNumber}</p>
        <p className="author">By Tim Van Cauwenberge</p>
      </div>
    </div>
  );
};

export default Home;
