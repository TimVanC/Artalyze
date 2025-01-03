import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaInfoCircle, FaChartBar, FaCog, FaShareAlt, FaPalette } from 'react-icons/fa';
import SwiperCore, { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import axiosInstance from '../axiosInstance';
import InfoModal from '../components/InfoModal';
import StatsModal from '../components/StatsModal';
import SettingsModal from '../components/SettingsModal';
import axios from 'axios';
import { handleShare } from '../utils/shareUtils';
import './Game.css';

const generateArtalyzeShareableResult = (results) => {
  const scoreLine = results.map(result => result ? '🟢' : '🔴').join(' ');
  const paintingLine = Array(results.length).fill('🖼️').join(' ');
  return `${scoreLine}\n${paintingLine}\n🎨 Artalyze Score: ${results.filter(r => r).length}/5`;
};

const isUserLoggedIn = () => {
  return !!localStorage.getItem('authToken');
};

const handleStatsShare = (results) => {
  const shareableText = generateArtalyzeShareableResult(results);

  if (navigator.share) {
    navigator.share({
      title: "Artalyze Score",
      text: shareableText,
    }).then(() => {
      console.log('Thanks for sharing!');
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(shareableText).then(() => {
      console.log('Score copied to clipboard');
    }).catch(console.error);
  }
};

const defaultStats = {
  gamesPlayed: 0,
  winPercentage: 0,
  currentStreak: 0,
  maxStreak: 0,
  perfectPuzzles: 0,
  mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
};

const Game = () => {
  const navigate = useNavigate();
  const isLoggedIn = isUserLoggedIn();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState([]);
  const [triesLeft, setTriesLeft] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [showScoreOverlay, setShowScoreOverlay] = useState(true);
  const [selectedCompletionMessage, setSelectedCompletionMessage] = useState("");
  const [imagePairs, setImagePairs] = useState([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isDisappearing, setIsDisappearing] = useState(false); // Added this state
  const [error, setError] = useState('');
  const swiperRef = useRef(null);
  let longPressTimer;

  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    winPercentage: 0,
    currentStreak: 0,
    maxStreak: 0,
    perfectPuzzles: 0,
    mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    lastPlayedDate: null,
  });

  // Function to be called on game completion
  const handleGameComplete = async () => {
    console.log('handleGameComplete called');
    setIsGameComplete(true);

    const today = new Date().toISOString().split('T')[0];

    if (isUserLoggedIn()) {
      if (!userId) {
        console.error('User ID not found. Ensure the user is logged in.');
        return;
      }

      try {
        console.log('Marking game as played for today...');
        const response = await axiosInstance.post('/game/mark-as-played', {
          isPerfectPuzzle: correctCount === imagePairs.length,
        });
        console.log('Game play status updated for today:', response.data);
        localStorage.setItem('lastPlayedDate', today);
      } catch (error) {
        console.error('Error marking game as played:', error.response?.data || error.message);
        localStorage.setItem('lastPlayedDate', today);
      }

      try {
        const payload = {
          correctAnswers: correctCount,
          totalQuestions: imagePairs.length,
        };

        console.log('Sending payload to update stats:', payload);

        const response = await axiosInstance.put(`/stats/${userId}`, payload, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        console.log('Stats updated successfully:', response.data);

        await fetchAndSetStats(userId);
      } catch (error) {
        console.error('Error updating user stats:', error.response?.data || error.message);
      }
    } else {
      console.log('User is not logged in, using localStorage to track game status and stats');
      localStorage.setItem('lastPlayedDate', today);

      const updatedStats = { ...stats };

      updatedStats.gamesPlayed += 1;

      const isPerfectPuzzle = correctCount === imagePairs.length;

      if (isPerfectPuzzle) {
        updatedStats.perfectPuzzles += 1;

        const lastPlayedDate = localStorage.getItem('lastPlayedDate');
        const lastPlayed = lastPlayedDate ? new Date(lastPlayedDate) : null;
        const todayDate = new Date(today);

        if (lastPlayed && todayDate - lastPlayed === 86400000) {
          updatedStats.currentStreak += 1;
        } else {
          updatedStats.currentStreak = 1;
        }

        updatedStats.maxStreak = Math.max(updatedStats.maxStreak, updatedStats.currentStreak);
      } else {
        updatedStats.currentStreak = 0;
      }

      updatedStats.winPercentage = Math.round(
        (updatedStats.perfectPuzzles / updatedStats.gamesPlayed) * 100
      );

      const mistakeCount = imagePairs.length - correctCount;
      updatedStats.mistakeDistribution[mistakeCount] =
        (updatedStats.mistakeDistribution[mistakeCount] || 0) + 1;

      updatedStats.lastPlayedDate = today;
      updatedStats.mostRecentScore = mistakeCount;

      setStats(updatedStats);

      localStorage.setItem('triesRemaining', triesLeft);
      localStorage.setItem('stats', JSON.stringify(updatedStats));

      console.log('Non-logged-in stats saved locally:', updatedStats);
    }
  };


  // Initialize game logic
  useEffect(() => {
    const initializeGame = async () => {
      const today = new Date().toISOString().split('T')[0];
      const isLoggedIn = isUserLoggedIn();
  
      if (isLoggedIn && !userId) {
        console.error('User is logged in but no userId found in localStorage.');
        setError('User ID is missing. Please log in again.');
        return;
      }
  
      try {
        if (isLoggedIn) {
          console.log('Checking if user has played today...');
          const playStatusResponse = await axiosInstance.get('/game/check-today-status', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          });
  
          if (playStatusResponse.data.hasPlayedToday) {
            console.log('User has already played today.');
            setIsGameComplete(true);
            await fetchAndSetStats(userId);
            return;
          }
  
          const triesResponse = await axiosInstance.get('/stats/tries', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          });
          setTriesLeft(triesResponse.data.triesRemaining);
  
          const selectionsResponse = await axiosInstance.get('/stats/selections', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          });
          setSelections(selectionsResponse.data.selections || []);
        } else {
          const lastPlayed = localStorage.getItem('lastPlayedDate');
          if (lastPlayed === today) {
            console.log('Guest user has already played today.');
            setIsGameComplete(true);
            return;
          }
  
          const storedTries = localStorage.getItem('triesRemaining');
          const storedDate = localStorage.getItem('triesDate');
          const savedSelections = localStorage.getItem('selections');
  
          if (storedDate !== today || !storedTries) {
            localStorage.setItem('triesRemaining', 3);
            localStorage.setItem('triesDate', today);
            setTriesLeft(3);
          } else {
            setTriesLeft(parseInt(storedTries, 10));
          }
  
          if (savedSelections) {
            setSelections(JSON.parse(savedSelections));
          }
        }
  
        console.log('Fetching daily puzzle...');
        const puzzleResponse = await axiosInstance.get('/game/daily-puzzle');
        if (puzzleResponse.data?.imagePairs?.length > 0) {
          const shuffledPairs = puzzleResponse.data.imagePairs.map((pair) => ({
            human: pair.humanImageURL,
            ai: pair.aiImageURL,
            images: Math.random() > 0.5
              ? [pair.humanImageURL, pair.aiImageURL]
              : [pair.aiImageURL, pair.humanImageURL],
          }));
          setImagePairs(shuffledPairs);
  
          // Delay setting Swiper until it's fully initialized
          setTimeout(() => {
            setCurrentIndex(0);
            if (swiperRef.current) {
              swiperRef.current.slideToLoop(0);
            }
          }, 100); // Adjust delay as needed
        } else {
          console.warn('No image pairs available for today.');
          setImagePairs([]);
        }
  
        if (isLoggedIn && userId) {
          await fetchAndSetStats(userId);
        }
      } catch (error) {
        console.error('Error during game initialization:', error.response?.data || error.message);
        setError('Failed to initialize the game. Please try again later.');
      }
    };
  
    if (!isGameComplete) {
      initializeGame();
    }
  }, [userId, isGameComplete]);
  
  



  useEffect(() => {
    if (isGameComplete) {
      const timer = setTimeout(() => {
        setIsStatsOpen(true); // Automatically open stats modal after completion
      }, 500); // 0.5 seconds delay

      return () => clearTimeout(timer); // Cleanup timeout on unmount or re-run
    }
  }, [isGameComplete]);


  const fetchAndSetStats = async () => {
    const userId = localStorage.getItem("userId"); // Ensure userId is fetched correctly
    if (!userId) {
      console.error("No userId found. Please log in again.");
      return;
    }

    try {
      const statsResponse = await axiosInstance.get(`/stats/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      setStats(statsResponse.data);
      console.log("Fetched user stats:", statsResponse.data);
    } catch (error) {
      console.error("Error fetching user stats:", error.response?.data || error.message);
    }
  };

  const decrementTries = async () => {
    try {
      if (isUserLoggedIn()) {
        const response = await axiosInstance.put('/stats/tries/decrement', {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        setTriesLeft(response.data.triesRemaining); // Update frontend state
      } else {
        const newTries = Math.max(triesLeft - 1, 0);
        localStorage.setItem('triesRemaining', newTries);
        setTriesLeft(newTries);
      }
    } catch (error) {
      console.error('Error decrementing tries:', error.response?.data || error.message);
    }
  };


  const updateUserStats = async (updatedStats) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("User ID not found. Cannot update stats.");
      return;
    }

    try {
      const response = await axiosInstance.put(`/stats/${userId}`, updatedStats, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      console.log("Stats updated successfully:", response.data);
    } catch (error) {
      console.error("Error updating stats:", error.response?.data || error.message);
    }
  };

  const saveSelectionsToBackend = async (updatedSelections) => {
    try {
      await axiosInstance.put(
        '/stats/selections',
        { selections: updatedSelections },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );
    } catch (error) {
      console.error('Error saving selections to backend:', error);
    }
  };


  const handleSelection = (selectedImage, isHumanSelection) => {
    // Update selections
    const updatedSelections = [...selections];
    updatedSelections[currentIndex] = {
      selected: selectedImage,
      isHumanSelection: isHumanSelection,
    };
    setSelections(updatedSelections);

    // Persist selections
    if (isUserLoggedIn()) {
      saveSelectionsToBackend(updatedSelections);
    } else {
      localStorage.setItem('selections', JSON.stringify(updatedSelections));
    }

    // Automatically move to the next image pair
    if (swiperRef.current) {
      const nextIndex = currentIndex + 1 < imagePairs.length ? currentIndex + 1 : 0;
      setCurrentIndex(nextIndex);
      swiperRef.current.slideToLoop(nextIndex); // Advance the Swiper slide
    }
  };



  const handleLongPress = (image) => {
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      setEnlargedImage(image);
    }, 500);
  };

  const handleRelease = () => {
    clearTimeout(longPressTimer);
  };

  const handleMidTurnFeedback = () => {
    setIsDisappearing(false);
    setTimeout(() => {
      setIsDisappearing(true);
    }, 1300); // Example delay for the disappearing animation
  };

  const handleRegister = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { token, user } = response.data;

      // Store userId and token in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('userId', user.userId);

      console.log('Registration successful:', user);
      navigate('/game'); // Redirect to the game or dashboard
    } catch (error) {
      console.error('Error during registration:', error.response?.data || error.message);
    }
  };


  const handleSubmit = () => {
    let correct = 0;

    selections.forEach((selection, index) => {
      if (selection.isHumanSelection && selection.selected === imagePairs[index].human) {
        correct++;
      }
    });

    setCorrectCount(correct);

    if (correct === imagePairs.length || triesLeft === 1) {
      setIsGameComplete(true);
      setShowOverlay(false); // Ensure no overlay on game completion
      handleGameComplete(); // Finalize game
    } else {
      setShowOverlay(true); // Display mid-turn feedback overlay
      decrementTries(); // Update tries remaining
    }
  };

  const handleTryAgain = () => {
    setShowOverlay(false);
    setShowResults(false);
    setIsDisappearing(false);
  };


  const handleSwipe = (swiper) => {
    setCurrentIndex(swiper.realIndex);
  };

  const closeEnlargedImage = () => {
    setEnlargedImage(null);
  };

  const isSubmitEnabled = selections.length === imagePairs.length;

  return (
    <div className="game-container">
      <div className="top-bar">
        <div className="app-title">Artalyze</div>
        <div className="icons-right">
          <FaInfoCircle className="icon" title="Info" onClick={() => setIsInfoOpen(true)} />
          <FaChartBar className="icon" title="Stats" onClick={() => setIsStatsOpen(true)} />
          <FaCog className="icon" title="Settings" onClick={() => setIsSettingsOpen(true)} />
        </div>
      </div>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        isLoggedIn={isLoggedIn} // Pass isLoggedIn to StatsModal
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {!isGameComplete && (
        <>
          <h1>Guess the human painting from each pair!</h1>
          <div className="progress-bar-container">
            <div className="progress-bar">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className="progress-bar-segment"
                  style={{
                    backgroundColor: index < correctCount ? "#4d73af" : "#e0e0e0",
                  }}
                />
              ))}
            </div>
          </div>

          <div className={`status-bar ${showOverlay ? 'blurred' : ''}`}>
            <div className="tries-left">
              <span>Tries Left:</span>
              {[...Array(triesLeft)].map((_, i) => (
                <FaPalette key={i} className="palette-icon" />
              ))}
            </div>
          </div>

          <Swiper
  loop={true}
  onSlideChange={(swiper) => setCurrentIndex(swiper.realIndex)}
  onSwiper={(swiper) => {
    swiperRef.current = swiper; // Store the Swiper instance
  }}
>
  {imagePairs.map((pair, index) => (
    <SwiperSlide key={index}>
      <div className="image-pair-container">
        {pair.images.map((image, idx) => (
          <div
            key={idx}
            className={`image-container ${selections[index]?.selected === image ? 'selected' : ''}`}
            onClick={() => handleSelection(image, image === pair.human)}
          >
            <img src={image} alt={`Painting ${idx + 1}`} />
          </div>
        ))}
      </div>
    </SwiperSlide>
  ))}
</Swiper>




          {enlargedImage && (
            <div className="enlarge-modal" onClick={closeEnlargedImage}>
              <img src={enlargedImage} alt="Enlarged view" className="enlarged-image" />
            </div>
          )}

          <div className="navigation-buttons">
            {imagePairs.map((_, index) => (
              <button
                key={index}
                className={`nav-button ${currentIndex === index ? 'active' : ''}`}
                onClick={() => {
                  if (swiperRef.current) {
                    swiperRef.current.slideToLoop(index);
                  }
                  setCurrentIndex(index);
                }}
              >
                {index + 1}
              </button>
            ))}
          </div>


          <button
            className={`submit-button ${isSubmitEnabled ? 'enabled' : 'disabled'}`}
            onClick={handleSubmit}
            disabled={!isSubmitEnabled}
          >
            Submit
          </button>
        </>
      )}

      {showOverlay && (
        <div className="results-overlay">
          <div className="overlay-content">
            <h2>You got {correctCount}/5 correct!</h2>
            <p>You have {triesLeft === 1 ? '1 try' : `${triesLeft} tries`} left.</p>
            <button
              onClick={() => setShowOverlay(false)} // Close overlay
              className="try-again-button"
            >
              Try Again
            </button>
          </div>
        </div>
      )}


      {isGameComplete && (
        <div className="completion-screen">
          <p>{selectedCompletionMessage}</p>
          <div className="horizontal-thumbnail-grid">
            {imagePairs.map((pair, index) => {
              const selection = selections[index];
              const isCorrect = selection?.selected === pair.human;

              return (
                <div key={index} className="pair-thumbnails-horizontal">
                  <div className={`thumbnail-container ${isCorrect && pair.images[0] === pair.human ? 'correct' : (selection?.selected === pair.images[0] ? 'incorrect' : '')}`}>
                    <img src={pair.images[0]} alt={`First painting for pair ${index + 1}`} />
                  </div>
                  <div className={`thumbnail-container ${isCorrect && pair.images[1] === pair.human ? 'correct' : (selection?.selected === pair.images[1] ? 'incorrect' : '')}`}>
                    <img src={pair.images[1]} alt={`Second painting for pair ${index + 1}`} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="completion-buttons">
            <button className="stats-button" onClick={() => setIsStatsOpen(true)}>
              <FaChartBar /> See Stats
            </button>
            <button className="share-button" onClick={() => handleStatsShare(selections.map(selection => selection?.isHumanSelection))}>
              <FaShareAlt /> Share
            </button>
          </div>
        </div>
      )}

      {enlargedImage && (
        <div className="enlarge-modal" onClick={closeEnlargedImage}>
          <img src={enlargedImage} alt="Enlarged view" className="enlarged-image" />
        </div>
      )}
    </div>
  );

};

export default Game;
