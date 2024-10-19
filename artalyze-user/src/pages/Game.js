import './Game.css';
import React, { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { FaPalette, FaInfoCircle, FaChartBar, FaCog } from 'react-icons/fa';

// Function to generate shareable result
const generateArtalyzeShareableResult = (results) => {
  const scoreLine = results.map(result => result ? '🟢' : '🔴').join(' ');
  const paintingLine = Array(results.length).fill('🖼️').join(' ');
  return `${scoreLine}\n${paintingLine}\n🎨 Artalyze Score: ${results.filter(r => r).length}/5`;
};

// Function to handle sharing
const handleShare = (results) => {
  const shareableText = generateArtalyzeShareableResult(results);

  if (navigator.share) {
    // If the Share API is supported, use it for a native sharing dialog
    navigator.share({
      title: 'My Artalyze Score',
      text: shareableText
    }).catch((error) => console.log('Error sharing:', error));
  } else {
    // Fallback to copying to clipboard
    navigator.clipboard.writeText(shareableText).then(() => {
      alert("Results copied to clipboard! You can now paste it anywhere.");
    }).catch((error) => {
      console.error('Failed to copy:', error);
    });
  }
};

const Game = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState([]);
  const [triesLeft, setTriesLeft] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const initialImagePairs = [
    { human: 'http://localhost:5000/uploads/1728260151091-Human-01.png', ai: 'http://localhost:5000/uploads/1728260592402-Ai-01.png' },
    { human: 'http://localhost:5000/uploads/1728260173602-Human-02.png', ai: 'http://localhost:5000/uploads/1728260592402-Ai-02.png' },
    { human: 'http://localhost:5000/uploads/1728260184652-Human-03.png', ai: 'http://localhost:5000/uploads/1728260592402-Ai-03.png' },
    { human: 'http://localhost:5000/uploads/1728260204969-Human-04.png', ai: 'http://localhost:5000/uploads/1728260592403-Ai-04.png' },
    { human: 'http://localhost:5000/uploads/1728260218274-Human-05.png', ai: 'http://localhost:5000/uploads/1728260592403-Ai-05.png' },
  ];
  const [imagePairs, setImagePairs] = useState([]);

  const swiperRef = useRef(null);
  let longPressTimer;

  useEffect(() => {
    const shuffledPairs = initialImagePairs.map(pair => {
      const images = Math.random() > 0.5 ? [pair.human, pair.ai] : [pair.ai, pair.human];
      return { human: pair.human, ai: pair.ai, images };
    });
    setImagePairs(shuffledPairs);
  }, []);

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

    if (correct === imagePairs.length || triesLeft === 1) {
      setIsGameComplete(true); // Directly go to the completion screen
      setShowOverlay(false);   // Make sure overlay does not show
      setShowResults(false);   // Ensure no results overlay
    } else {
      setShowOverlay(true);    // Show overlay for incorrect attempts
      setTriesLeft(triesLeft - 1);
    }
  };

  const handleTryAgain = () => {
    setShowOverlay(false); // Hide overlay but keep selections
    setShowResults(false); // Reset results without resetting Swiper
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
      {/* Top Bar */}
      <div className="top-bar">
        <div className="app-title">Artalyze</div>
        <div className="icons-right">
          <FaInfoCircle className="icon" title="Info" />
          <FaChartBar className="icon" title="Stats" />
          <FaCog className="icon" title="Settings" />
        </div>
      </div>

      {!isGameComplete && (
        <>
          <h1>Guess the human painting from each pair!</h1>

          {/* Progress Bar */}
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

      {/* Overlay */}
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
    <h2>Game Complete!</h2>
    <p>{correctCount}/5 correct</p>
    <div className="horizontal-thumbnail-grid">
      {imagePairs.map((pair, index) => {
        const selection = selections[index];
        const isCorrect = selection?.selected === pair.human;

        return (
          <div key={index} className="pair-thumbnails-horizontal">
            {/* Ensure only the human image is highlighted in green for correct guesses */}
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
      <button className="stats-button">See Stats</button>
      <button className="share-button" onClick={() => handleShare([true, true, false, true, false])}>Share</button>
    </div>
  </div>
)}



      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div className="enlarge-modal" onClick={closeEnlargedImage}>
          <img src={enlargedImage} alt="Enlarged view" className="enlarged-image" />
        </div>
      )}
    </div>
  );
};

export default Game;
