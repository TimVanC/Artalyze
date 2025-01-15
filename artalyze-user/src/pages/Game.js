import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaInfoCircle, FaChartBar, FaCog, FaShareAlt, FaPalette } from 'react-icons/fa';
import logo from '../assets/images/artalyze-logo.png';
import SwiperCore, { Swiper, SwiperSlide } from 'swiper/react';
import { getTodayInEST } from '../utils/dateUtils';
import { calculatePuzzleNumber } from '../utils/puzzleUtils';
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
  const statsTimerRef = useRef(null);
  const isLoggedIn = isUserLoggedIn();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState([]);
  const [triesLeft, setTriesLeft] = useState(3);
  const [triesRemaining, setTriesRemaining] = useState(3);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const longPressTimer = useRef(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [showScoreOverlay, setShowScoreOverlay] = useState(true);
  const [selectedCompletionMessage, setSelectedCompletionMessage] = useState("");
  const [imagePairs, setImagePairs] = useState([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isDisappearing, setIsDisappearing] = useState(false);
  const [isStatsModalDismissed, setIsStatsModalDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const swiperRef = useRef(null);

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

  // Place fetchSelections above handleGameComplete in Game.js
  const fetchSelections = async () => {
    const isLoggedIn = Boolean(localStorage.getItem('authToken'));

    if (!isLoggedIn) {
      console.log("Guest user: Fetching selections from localStorage.");
      const savedSelections = localStorage.getItem('selections');
      return savedSelections ? JSON.parse(savedSelections) : []; // Ensure an array is returned
    }

    try {
      const { data } = await axiosInstance.get('/stats/selections');
      return data.selections || []; // Ensure an array is returned
    } catch (error) {
      console.error('Error fetching selections:', error.response?.data || error.message);
      return []; // Fallback to an empty array on error
    }
  };

  // Helper function to save triesRemaining to localStorage
  const saveTriesToLocalStorage = (tries) => {
    localStorage.setItem('triesRemaining', tries);
  };

  // Function to be called on game completion
  const handleGameComplete = async () => {
    console.log("handleGameComplete called");
    setIsGameComplete(true);

    // Fetch the latest selections from the backend
    const latestSelections = await fetchSelections();

    if (!Array.isArray(latestSelections)) {
      console.error("Invalid selections data format:", latestSelections);
      return; // Exit gracefully if data is invalid
    }

    console.log("Latest selections fetched:", latestSelections);

    // Calculate correct answers with detailed debugging
    const correctCount = latestSelections.reduce((count, selection, index) => {
      console.log(`Selection ${index}:`, selection);
      console.log(`Image Pair ${index}:`, imagePairs[index]);
      if (
        selection &&
        imagePairs[index] &&
        selection.selected === imagePairs[index].human
      ) {
        console.log(`Correct Match at index ${index}`);
        return count + 1;
      }
      console.log(`Mismatch at index ${index}`);
      return count;
    }, 0);

    console.log("Final Correct Answers Count (correctCount):", correctCount);
    console.log("Total questions (imagePairs.length):", imagePairs.length);

    // Proceed with marking the game as played and updating stats
    try {
      const payload = {
        correctAnswers: correctCount,
        totalQuestions: imagePairs.length,
      };

      console.log("Sending payload to update stats:", payload);

      const statsResponse = await axiosInstance.put(`/stats/${userId}`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      console.log("Stats updated successfully in handleGameComplete:", statsResponse.data);
      await fetchAndSetStats(userId);
      console.log("Stats re-fetched after game completion in handleGameComplete:", stats);
      setTimeout(() => setIsStatsOpen(true), 400);
    } catch (error) {
      console.error("Error updating user stats:", error.response?.data || error.message);
    }
  };

  // Initialize game logic
  const initializeGame = async () => {
    const today = getTodayInEST();
    const isLoggedIn = isUserLoggedIn();

    if (isLoggedIn && !userId) {
      console.error('User is logged in but no userId found in localStorage.');
      setError('User ID is missing. Please log in again.');
      return;
    }

    try {
      setLoading(true); // Start loading animation

      if (isLoggedIn) {
        console.log('Checking if user has played today...');
        const playStatusResponse = await axiosInstance.get('/game/check-today-status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });

        const { hasPlayedToday, triesRemaining } = playStatusResponse.data;

        if (!hasPlayedToday) {
          console.log('New day detected. Resetting game state.');
          const resetResponse = await axiosInstance.put('/stats/tries/reset', {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
          });

          setTriesLeft(resetResponse.data.triesRemaining || 3);
          setSelections([]);
          setImagePairs([]);
          setIsGameComplete(false);
          await fetchAndSetStats(userId);
        } else {
          setTriesLeft(triesRemaining);
          restoreGameState();
          setIsGameComplete(true);
          setTimeout(() => setIsStatsOpen(true), 400);
        }
      } else {
        const lastPlayed = localStorage.getItem('lastPlayedDate');
        const storedTries = localStorage.getItem('triesRemaining');
        const savedSelections = localStorage.getItem('selections');

        if (lastPlayed !== today) {
          console.log('Guest user: New day detected. Resetting game state.');
          localStorage.setItem('triesRemaining', 3);
          localStorage.setItem('lastPlayedDate', today);
          setTriesLeft(3);
          setSelections([]);
          setImagePairs([]);
          setIsGameComplete(false);
        } else {
          if (storedTries) {
            setTriesLeft(parseInt(storedTries, 10));
          }
          if (savedSelections) {
            setSelections(JSON.parse(savedSelections));
          }
        }
      }

      console.log("Fetching daily puzzle...");
      const puzzleResponse = await axiosInstance.get('/game/daily-puzzle');
      console.log("Daily puzzle response:", puzzleResponse.data);

      if (puzzleResponse.data?.imagePairs?.length > 0) {
        console.log("Setting image pairs...");
        setImagePairs(puzzleResponse.data.imagePairs.map((pair) => ({
          human: pair.humanImageURL,
          ai: pair.aiImageURL,
          images: Math.random() > 0.5
            ? [pair.humanImageURL, pair.aiImageURL]
            : [pair.aiImageURL, pair.humanImageURL],
        })));
        localStorage.setItem('completedPairs', JSON.stringify(puzzleResponse.data.imagePairs)); // Save image pairs for persistence
      } else {
        console.warn("No image pairs available for today.");
        setImagePairs([]);
      }

      if (isLoggedIn && userId) {
        await fetchAndSetStats(userId);
      }
    } catch (error) {
      console.error('Error during game initialization:', error.response?.data || error.message);
      setError('Failed to initialize the game. Please try again later.');
    } finally {
      setLoading(false); // Stop loading animation
    }
  };


  // Restore game state function
  const restoreGameState = () => {
    const savedPairs = localStorage.getItem('completedPairs');
    const savedSelections = localStorage.getItem('selections');

    if (savedPairs) {
      const pairs = JSON.parse(savedPairs);
      setImagePairs(
        pairs.map(pair => ({
          human: pair.humanImageURL,
          ai: pair.aiImageURL,
          images: Math.random() > 0.5
            ? [pair.humanImageURL, pair.aiImageURL]
            : [pair.aiImageURL, pair.humanImageURL],
        }))
      );

      if (savedSelections) {
        const selections = JSON.parse(savedSelections);
        setSelections(selections);

        const firstSelectionIndex = selections.findIndex(
          (selection) => selection && selection.selected
        );

        setTimeout(() => {
          setCurrentIndex(firstSelectionIndex >= 0 ? firstSelectionIndex : 0);
          if (swiperRef.current) {
            swiperRef.current.slideToLoop(firstSelectionIndex >= 0 ? firstSelectionIndex : 0, 0);
          }
        }, 100);
      } else {
        setTimeout(() => {
          setCurrentIndex(0);
          if (swiperRef.current) {
            swiperRef.current.slideToLoop(0);
          }
        }, 100);
      }
    } else {
      console.warn("No completed pairs found in localStorage.");
      setImagePairs([]);
      setSelections([]);
    }
  };

  // useEffect for game logic
  useEffect(() => {
    if (!isGameComplete) {
      console.log('Game is not complete. Initializing game state.');
      initializeGame();
    } else {
      console.log('Game is complete. Restoring game state.');
      restoreGameState();
    }
  }, [userId, isGameComplete]);

  // Updated useEffect for imagePairs
  useEffect(() => {
    console.log('Image pairs state updated:', imagePairs);

    if (imagePairs.length > 0) {
      console.log('Initializing Swiper with current index:', currentIndex);
      setTimeout(() => {
        if (swiperRef.current) {
          swiperRef.current.slideToLoop(currentIndex, 0);
        }
      }, 100); // Ensure Swiper is fully initialized
    } else {
      console.log('No image pairs available to display.');
    }
  }, [currentIndex, imagePairs]);

  // Save selections to localStorage whenever they are updated
  useEffect(() => {
    if (selections.length > 0) {
      localStorage.setItem('selections', JSON.stringify(selections));
    }
  }, [selections]);

  useEffect(() => {
    if (isStatsModalDismissed) {
      document.querySelectorAll('.thumbnail-container.pulse').forEach((el, index) => {
        console.log(`Applying animation to element ${index + 1}`);
        el.style.animationDelay = `${index * 0.1}s`; // Optional: Staggered animation delay
        el.classList.add('animate-pulse');
      });
    }
  }, [isStatsModalDismissed]);
  
  


  const fetchAndSetStats = async () => {
    const userId = localStorage.getItem("userId");
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
      console.log("Fetched user stats from API in fetchAndSetStats:", statsResponse.data);

      // Log mistake distribution specifically
      console.log("Fetched Mistake Distribution:", statsResponse.data.mistakeDistribution);

      // Update the stats state
      setStats(statsResponse.data);
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
        setTriesLeft(response.data.triesRemaining);
        saveTriesToLocalStorage(response.data.triesRemaining); // Persist to localStorage
      } else {
        const newTries = Math.max(triesLeft - 1, 0);
        setTriesLeft(newTries);
        saveTriesToLocalStorage(newTries); // Persist to localStorage
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

  const saveSelectionsToLocalStorage = (selections) => {
    localStorage.setItem('selections', JSON.stringify(selections));
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
      saveSelectionsToBackend(updatedSelections); // Save to backend
    } else {
      saveSelectionsToLocalStorage(updatedSelections); // Save to localStorage
    }

    // Automatically move to the next image pair
    if (swiperRef.current) {
      const nextIndex = currentIndex + 1 < imagePairs.length ? currentIndex + 1 : 0;
      setCurrentIndex(nextIndex);
      swiperRef.current.slideToLoop(nextIndex); // Advance the Swiper slide
    }
  };

  const handleCompletionShare = (selections, imagePairs) => {
    // Calculate the score based on correct selections
    const score = selections.filter((isCorrect) => isCorrect).length;

    // Get the puzzle number dynamically
    const puzzleNumber = calculatePuzzleNumber();

    // Build the visual representation of results
    const resultsVisual = selections
      .map((isCorrect) => (isCorrect ? '🟢' : '🔴'))
      .join(' ');

    // Add placeholder for painting emojis
    const paintings = '🖼️ '.repeat(imagePairs.length).trim();

    // Construct the shareable text
    const shareableText = `
  Artalyze #${puzzleNumber} ${score}/${imagePairs.length}
  ${resultsVisual}
  ${paintings}
  Try it at: artalyze.app
  `;

    // Check if the device supports native sharing
    if (navigator.share) {
      navigator
        .share({
          title: `Artalyze #${puzzleNumber}`,
          text: shareableText.trim(),
        })
        .catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback to clipboard copy if native sharing is unavailable
      navigator.clipboard
        .writeText(shareableText.trim())
        .then(() => {
          alert('Results copied to clipboard! You can now paste it anywhere.');
        })
        .catch((error) => {
          console.error('Failed to copy:', error);
        });
    }
  };

  const handleLongPress = (image) => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setEnlargedImage(image);
    }, 500); // Adjust time as needed
  };

  const handleRelease = () => {
    clearTimeout(longPressTimer.current);
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

  const handleAttempt = async () => {
    if (triesRemaining > 0) {
      try {
        const { data } = await axios.put('/stats/tries/decrement', {
          userId: localStorage.getItem('userId')
        });
        setTriesRemaining(data.triesRemaining);
      } catch (error) {
        console.error('Error decrementing tries:', error);
      }
    } else {
      alert('No tries remaining for today!');
    }
  };

  const handleSwipe = (swiper) => {
    setCurrentIndex(swiper.realIndex);
  };

  const handleStatsModalClose = () => {
    setIsStatsOpen(false);
    setTimeout(() => setIsStatsModalDismissed(true), 300); // Allow modal close animation to finish
  };

  const closeEnlargedImage = () => {
    setEnlargedImage(null);
  };

  const isSubmitEnabled = selections.length === imagePairs.length;

  return (
    <div className="game-container">
      {/* Full Page Loading Screen */}
      {loading && (
        <div className="full-page-loading-screen">
          <img src={logo} alt="Artalyze Logo" className="loading-logo" />
          <div className="full-page-progress-bar">
            <div className="full-page-progress-fill"></div>
          </div>
        </div>
      )}
      {/* Top Bar */}
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
        onClose={handleStatsModalClose}
        stats={stats}
        isLoggedIn={isLoggedIn}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isLoggedIn={Boolean(localStorage.getItem('authToken'))}
      />

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

          {imagePairs.length > 0 ? (
            <Swiper
              loop={true}
              onSlideChange={(swiper) => setCurrentIndex(swiper.realIndex)}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                swiper.slideToLoop(0);
                console.log("Swiper Initialized to Index:", currentIndex);
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
                        onMouseDown={() => handleLongPress(image)}
                        onMouseUp={handleRelease}
                        onTouchStart={() => handleLongPress(image)}
                        onTouchEnd={handleRelease}
                      >
                        <img
                          src={image}
                          alt={`Painting ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p>No image pairs available.</p>
          )}

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
                  setCurrentIndex(index);
                  swiperRef.current.slideToLoop(index);
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
              onClick={() => setShowOverlay(false)}
              className="try-again-button"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

{isGameComplete && (
  <div className="completion-screen">
    <p className="completion-message"><strong>{selectedCompletionMessage}</strong></p>
    <div className="completion-score-container">
      <span className="completion-score-badge">
        {selections.filter(s => s?.selected === imagePairs[selections.indexOf(s)]?.human).length}/5 correct
      </span>
    </div>
    <p className="image-pair-message">Here are the image pairs and your results:</p>
    <div className="horizontal-thumbnail-grid">
      {imagePairs.map((pair, index) => {
        const selection = selections[index];
        const isCorrect = selection?.selected === pair.human;

        return (
          <div key={index} className="pair-thumbnails-horizontal">
            <div
              className={`thumbnail-container ${
                selection?.selected === pair.human
                  ? isCorrect
                    ? 'correct pulse'
                    : 'incorrect pulse'
                  : ''
              }`}
            >
              <img src={pair.human} alt={`Human Painting for pair ${index + 1}`} />
            </div>
            <div
              className={`thumbnail-container ${
                selection?.selected === pair.ai
                  ? isCorrect
                    ? 'correct pulse'
                    : 'incorrect pulse'
                  : ''
              }`}
            >
              <img src={pair.ai} alt={`AI Painting for pair ${index + 1}`} />
            </div>
          </div>
        );
      })}
    </div>

    <div className="completion-buttons">
      <button className="stats-button" onClick={() => setIsStatsOpen(true)}>
        <FaChartBar /> See Stats
      </button>
      <button
        className="share-button"
        onClick={() => handleCompletionShare(selections.map(s => s?.isHumanSelection), imagePairs)}
      >
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
