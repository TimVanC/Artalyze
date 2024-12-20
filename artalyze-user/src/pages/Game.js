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

  // Function to update user stats in the backend
  const updateUserStats = async (userId, updatedStats) => {
    try {
      const response = await axiosInstance.put(`/stats/${userId}`, updatedStats, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      console.log('Stats updated in database:', response.data);
    } catch (error) {
      console.error('Error updating stats in database:', error.response?.data || error.message);
    }
  };

  // Function to be called on game completion
  const handleGameComplete = async () => {
    console.log('handleGameComplete called');
    setIsGameComplete(true);
    localStorage.setItem('isGameComplete', true);
  
    const today = new Date().toISOString().split('T')[0];
    const isPerfectPuzzle = correctCount === imagePairs.length;
  
    const updateStats = (stats, isPerfect) => {
      stats.gamesPlayed += 1;
  
      if (isPerfect) {
        stats.perfectPuzzles += 1;
        const lastPlayed = stats.lastPlayedDate ? new Date(stats.lastPlayedDate) : null;
        const todayDate = new Date(today);
  
        if (lastPlayed && todayDate - lastPlayed === 86400000) {
          stats.currentStreak += 1;
        } else {
          stats.currentStreak = 1;
        }
  
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
      } else {
        stats.currentStreak = 0;
      }
  
      stats.winPercentage = Math.round((stats.perfectPuzzles / stats.gamesPlayed) * 100);
      const mistakeCount = imagePairs.length - correctCount;
      stats.mistakeDistribution[mistakeCount] =
        (stats.mistakeDistribution[mistakeCount] || 0) + 1;
  
      stats.lastPlayedDate = today;
      stats.mostRecentScore = mistakeCount;
  
      return stats;
    };
  
    if (isUserLoggedIn()) {
      if (!userId) {
        console.error('User ID not found. Ensure the user is logged in.');
        return;
      }
  
      try {
        console.log('Marking game as played for today...');
        await axiosInstance.post('/game/mark-as-played', {
          isPerfectPuzzle,
          triesLeft,
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });
  
        let updatedStats = updateStats({ ...stats }, isPerfectPuzzle);
        setStats(updatedStats);
  
        await axiosInstance.put(
          `/stats/${userId}`,
          {
            correctAnswers: correctCount,
            totalQuestions: imagePairs.length,
            triesRemaining: triesLeft,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );
  
        console.log('User stats updated successfully in the backend.');
        await fetchAndSetStats(userId);
      } catch (error) {
        console.error('Error updating user stats:', error.response?.data || error.message);
      }
    } else {
      console.log('User is not logged in, using localStorage to track game status and stats');
      localStorage.setItem('lastPlayedDate', today);
      let updatedStats = updateStats({ ...stats }, isPerfectPuzzle);
  
      localStorage.setItem('triesRemaining', triesLeft);
      localStorage.setItem('stats', JSON.stringify(updatedStats));
  
      setStats(updatedStats);
      console.log('Non-logged-in stats saved locally:', updatedStats);
    }
  };
  
  
// Initialization effect for the game
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
          setTriesLeft(playStatusResponse.data.triesLeft);
          setIsGameComplete(playStatusResponse.data.triesLeft === 0);
          await fetchAndSetStats(userId);
          return;
        } else {
          setTriesLeft(3);
          localStorage.setItem('triesRemaining', 3);
        }
      } else {
        const lastPlayed = localStorage.getItem('lastPlayedDate');
        const storedTries = parseInt(localStorage.getItem('triesRemaining'), 10);
        const storedSelections = JSON.parse(localStorage.getItem('selections')) || [];
        const storedGameComplete = localStorage.getItem('isGameComplete') === 'true';
        const storedImagePairs = JSON.parse(localStorage.getItem('imagePairs')) || [];

        if (lastPlayed === today) {
          console.log('Guest user has already played today.');
          setTriesLeft(storedTries || 0);
          setSelections(storedSelections); // Restore selections
          setImagePairs(storedImagePairs); // Restore image pairs
          setIsGameComplete(storedGameComplete);
          return;
        } else {
          console.log('New day for guest user.');
          localStorage.setItem('triesRemaining', 3);
          setTriesLeft(3);
          localStorage.setItem('lastPlayedDate', today);
          localStorage.removeItem('selections'); // Clear selections for new day
          localStorage.removeItem('isGameComplete');
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
        localStorage.setItem('imagePairs', JSON.stringify(shuffledPairs));
      } else {
        console.warn('No image pairs available for today.');
        setImagePairs([]);
        localStorage.removeItem('imagePairs');
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
}, [userId, stats.lastPlayedDate, isGameComplete]);


// Effect to automatically open stats modal after game completion
useEffect(() => {
  if (isGameComplete) {
    const timer = setTimeout(() => {
      setIsStatsOpen(true); // Automatically open stats modal after completion
    }, 500); // 0.5 seconds delay

    return () => clearTimeout(timer); // Cleanup timeout on unmount or re-run
  }
}, [isGameComplete]);

// Effect to persist tries in localStorage or database
useEffect(() => {
  if (triesLeft !== undefined && triesLeft !== null) {
    const isLoggedIn = isUserLoggedIn();

    if (isLoggedIn && userId) {
      axiosInstance.put(
        '/game/update-tries',
        { triesLeft },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      ).catch((error) => {
        console.error('Failed to update tries for logged-in user:', error);
      });
    } else {
      localStorage.setItem('triesLeft', triesLeft); // Save triesLeft for guest users
    }
  }
}, [triesLeft, userId]);



  const fetchAndSetStats = async (userId) => {
    if (!userId) {
      console.error('No userId provided to fetch stats.');
      return;
    }

    try {
      const statsResponse = await axiosInstance.get(`/stats/${userId}`);
      setStats(statsResponse.data); // Set the stats, including the new `mostRecentScore`
      console.log('Fetched user stats:', statsResponse.data);
    } catch (error) {
      console.error('Error fetching user stats:', error.response?.data || error.message);
      setError('Unable to fetch user statistics. Please try again later.');
    }
  };


  const handleSelection = (selectedImage, isHumanSelection) => {
    const newSelection = { selected: selectedImage, isHumanSelection };
    const updatedSelections = [...selections];
    updatedSelections[currentIndex] = newSelection;
    setSelections(updatedSelections);
  
    // Save selections to localStorage
    localStorage.setItem('selections', JSON.stringify(updatedSelections));
  
    if (swiperRef.current && currentIndex + 1 < imagePairs.length) {
      swiperRef.current.slideNext();
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
      setShowOverlay(false); // Ensure no mid-turn overlay on game completion
      handleGameComplete(); // Trigger game complete actions
    } else {
      setShowOverlay(true); // Display mid-turn feedback
      // Decrement tries here only when the game is not complete
      setTriesLeft((prevTries) => Math.max(prevTries - 1, 0));
      localStorage.setItem('triesRemaining', Math.max(triesLeft - 1, 0)); // Sync with localStorage
    }
  };

  const handleTry = async () => {
    if (triesLeft > 0) {
      try {
        const response = await axiosInstance.post("/game/use-try");
        setTriesLeft(response.data.triesLeft);
        if (response.data.isGameComplete) {
          setIsGameComplete(true);
        }
      } catch (error) {
        console.error("Error using a try:", error);
      }
    } else {
      console.log("No tries left!");
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
            onSlideChange={handleSwipe}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
          >
            {imagePairs.map((pair, index) => (
              <SwiperSlide key={index}>
                <div className={`image-pair-container ${showOverlay ? 'blurred' : ''}`}>
                  {pair.images.map((image, idx) => (
                    <div
                      key={idx}
                      className={`image-container ${selections[index]?.selected === image ? 'selected' : ''}`}
                      onMouseDown={() => handleLongPress(image)}
                      onMouseUp={handleRelease}
                      onTouchStart={() => handleLongPress(image)}
                      onTouchEnd={handleRelease}
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
            {triesLeft === 0 || correctCount === 5 ? (
              <h2>
                {correctCount}/5 {correctCount === 5 ? "Yay you did it!" : "Better luck tomorrow!"}
              </h2>
            ) : (
              <>
                <h2>You got {correctCount}/5 correct!</h2>
                <p>You have {triesLeft === 1 ? '1 try' : `${triesLeft} tries`} left.</p>
                <button onClick={handleTryAgain} className="try-again-button">
                  Try Again
                </button>
              </>
            )}
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
