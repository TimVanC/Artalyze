import './Game.css';
import React, { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { FaPalette, FaInfoCircle, FaChartBar, FaCog, FaShareAlt } from 'react-icons/fa';
import InfoModal from '../components/InfoModal';
import SettingsModal from '../components/SettingsModal';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';

// Completion messages based on score
const completionMessages = {
  0: [
    "Tough luck! But hey, there's always tomorrow!",
    "Not your day? Don’t worry, try again tomorrow!",
    "Missed them all, but the next game awaits!"
  ],
  1: [
    "A small victory! You got 1 right. Come back for more!",
    "One down, but there’s room to improve!",
    "You got 1 correct! Keep challenging yourself!"
  ],
  2: [
    "Almost halfway! Keep going, you’re getting there!",
    "Two right! Not bad, but there’s room for improvement.",
    "You got 2 right—nicely done! Try for more next time."
  ],
  3: [
    "Solid effort! You’re halfway there. Keep it up!",
    "Three out of five! You’re on the right track!",
    "Nicely done! 3 correct answers—almost there!"
  ],
  4: [
    "So close! You nailed 4 out of 5!",
    "Almost perfect! Just one shy of a full score.",
    "You got 4 right—fantastic job! Can you make it 5 tomorrow?"
  ],
  5: [
    "Perfect score! 5 out of 5! You’re on fire!",
    "Amazing! You got them all right! Way to go!",
    "5/5! You’ve mastered today’s challenge!"
  ]
};

// Function to get a random message based on score
const getRandomCompletionMessage = (score) => {
  const messages = completionMessages[score];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
};

// Function to generate shareable result
const generateArtalyzeShareableResult = (results) => {
  const scoreLine = results.map(result => result ? '🟢' : '🔴').join(' ');
  const paintingLine = Array(results.length).fill('🖼️').join(' ');
  return `${scoreLine}\n${paintingLine}\n🎨 Artalyze Score: ${results.filter(r => r).length}/5`;
};

const isUserLoggedIn = () => {
  return !!localStorage.getItem('authToken');
};

// Function to handle sharing
const handleShare = (results) => {
  const shareableText = generateArtalyzeShareableResult(results);

  if (navigator.share) {
    navigator.share({
      title: 'My Artalyze Score',
      text: shareableText
    }).catch((error) => console.log('Error sharing:', error));
  } else {
    navigator.clipboard.writeText(shareableText).then(() => {
      alert("Results copied to clipboard! You can now paste it anywhere.");
    }).catch((error) => {
      console.error('Failed to copy:', error);
    });
  }
};

const Game = () => {
  const navigate = useNavigate();
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
  const [error, setError] = useState('');

  const swiperRef = useRef(null);
  let longPressTimer;

// Function to be called on game completion
const handleGameComplete = async () => {
  console.log('handleGameComplete called');
  setIsGameComplete(true);

  if (isUserLoggedIn()) {
    try {
      console.log('Marking game as played for today...');
      const response = await axiosInstance.post('/game/mark-as-played');
      console.log('Game play status updated for today:', response.data);
    } catch (error) {
      console.error('Error marking game as played:', error);
    }
  } else {
    console.log('User is not logged in, using localStorage to track last played date');
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('lastPlayedDate', today);
  }

  // Save selections and image pairs to localStorage
  localStorage.setItem('gameSelections', JSON.stringify(selections));
  localStorage.setItem('gameImagePairs', JSON.stringify(imagePairs));
};


// useEffect to check if the game is played and to fetch the puzzle
useEffect(() => {
  const checkIfPlayedTodayAndFetchPuzzle = async () => {
    const today = new Date().toISOString().split('T')[0];

    if (isUserLoggedIn()) {
      try {
        console.log('Checking if user has played today...');
        const response = await axiosInstance.get('/game/check-today-status');
        console.log('Check play status response:', response.data);
        if (response.data.hasPlayedToday) {
          console.log('User has already played today');
          setIsGameComplete(true);
          return;
        }
      } catch (error) {
        console.error('Error checking play status:', error);
      }
    } else {
      console.log('User not logged in, checking localStorage...');
      const lastPlayed = localStorage.getItem('lastPlayedDate');
      if (lastPlayed === today) {
        console.log('Guest user has already played today');
        setIsGameComplete(true);
        return;
      }
    }

    // Fetch the daily puzzle if the game has not been played yet
    try {
      console.log('Fetching daily puzzle...');
      const puzzleResponse = await axiosInstance.get('/game/daily-puzzle');
      console.log('Daily puzzle response:', puzzleResponse.data);

      if (puzzleResponse.data && puzzleResponse.data.imagePairs && puzzleResponse.data.imagePairs.length > 0) {
        const shuffledPairs = puzzleResponse.data.imagePairs.map(pair => {
          const images = Math.random() > 0.5 ? [pair.humanImageURL, pair.aiImageURL] : [pair.aiImageURL, pair.humanImageURL];
          return { human: pair.humanImageURL, ai: pair.aiImageURL, images };
        });
        setImagePairs(shuffledPairs);
        console.log('Image pairs set:', shuffledPairs);
      } else {
        console.warn('No image pairs available for today.');
        setImagePairs([]);
      }
    } catch (error) {
      console.error('Error fetching daily puzzle:', error);
      setError('Failed to load today\'s puzzle. Please try again later.');
    }
  };

  checkIfPlayedTodayAndFetchPuzzle();
}, []);

// Restore selections and image pairs if the game is completed and there are saved results
useEffect(() => {
  if (isGameComplete) {
    const savedSelections = JSON.parse(localStorage.getItem('gameSelections'));
    const savedImagePairs = JSON.parse(localStorage.getItem('gameImagePairs'));

    if (savedSelections && savedImagePairs) {
      console.log('Restoring saved selections and image pairs...');
      setSelections(savedSelections);
      setImagePairs(savedImagePairs);
    }
  }
}, [isGameComplete]);


// Trigger handleGameComplete function when the game is complete
const onGameComplete = () => {
  console.log('Game is completed. Calling handleGameComplete...');
  handleGameComplete();
};

  const handleSelection = (selectedImage, isHumanSelection) => {
    const newSelection = { selected: selectedImage, isHumanSelection };
    const updatedSelections = [...selections];
    updatedSelections[currentIndex] = newSelection;
    setSelections(updatedSelections);

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

  const handleSubmit = () => {
    let correct = 0;
    selections.forEach((selection, index) => {
        if (selection.isHumanSelection && selection.selected === imagePairs[index].human) {
            correct++;
        }
    });

    setCorrectCount(correct);
    const message = getRandomCompletionMessage(correct);
    setSelectedCompletionMessage(message);

    if (correct === imagePairs.length || triesLeft === 1) {
        setIsGameComplete(true); 
        setShowOverlay(false); 
        setShowResults(false); 

        // Trigger game complete function to mark the game as played
        onGameComplete();
    } else {
        setShowOverlay(true); 
        setTriesLeft(triesLeft - 1);
    }
};

  const handleTryAgain = () => {
    setShowOverlay(false);
    setShowResults(false);
  };

  const handleDismissOverlay = () => {
    setShowScoreOverlay(false);
  };

  const handleSwipe = (swiper) => {
    setCurrentIndex(swiper.realIndex);
  };

  const closeEnlargedImage = () => {
    setEnlargedImage(null);
  };

  const isSubmitEnabled = selections.length === imagePairs.length;

  const getScoreOverlayMessage = () => {
    if (correctCount === 5) {
      return "Perfect Score! 🎉 You got all 5 correct!";
    } else if (correctCount === 0) {
      return "Better Luck Next Time! You scored 0/5. Come back tomorrow to try again!";
    } else {
      return `Well Done! You scored ${correctCount}/5!`;
    }
  };

  return (
    <div className="game-container">
      {isGameComplete && showScoreOverlay && (
        <div className="score-overlay">
          <div className="score-overlay-content">
            <h2>{getScoreOverlayMessage()}</h2>
            <button className="view-results-button" onClick={handleDismissOverlay}>View Results</button>
          </div>
        </div>
      )}
       <div className="top-bar">
        <div className="app-title">Artalyze</div>
        <div className="icons-right">
          <FaInfoCircle className="icon" title="Info" onClick={() => setIsInfoOpen(true)} />
          <FaChartBar className="icon" title="Stats" />
          <FaCog className="icon" title="Settings" onClick={() => setIsSettingsOpen(true)} />
        </div>
      </div>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
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

{isGameComplete && !showScoreOverlay && (
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
      <button className="stats-button">
        <FaChartBar /> See Stats
      </button>
      <button className="share-button" onClick={() => handleShare([true, true, false, true, false])}>
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
