import './Game.css';
import React, { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { FaPalette, FaInfoCircle, FaChartBar, FaCog } from 'react-icons/fa';

const Game = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState([]);
  const [triesLeft, setTriesLeft] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);

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

  // Randomize images in each pair
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
    }, 500); // Detect long press (500ms)
  };

  const handleRelease = () => {
    clearTimeout(longPressTimer); // Cancel the long press if released early
  };

  const handleSubmit = () => {
    setHasSubmittedOnce(true);

    let correct = 0;
    selections.forEach((selection, index) => {
      if (selection.isHumanSelection && selection.selected === imagePairs[index].human) {
        correct++;
      }
    });

    setCorrectCount(correct);
    setShowResults(true);

    if (correct === imagePairs.length || triesLeft === 1) {
      setIsGameComplete(true);
    } else {
      setTriesLeft(triesLeft - 1);
    }
  };

  const handleTryAgain = () => {
    setShowResults(false);
    setCurrentIndex(0);
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
        <div className="icons">
          <FaInfoCircle className="icon" title="Info" />
          <FaChartBar className="icon" title="Stats" />
          <FaCog className="icon" title="Settings" />
        </div>
      </div>

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

      {!isGameComplete ? (
        <>
          <div className="status-bar">
            <div className="tries-left">
              <span>Tries Left:</span>
              {[...Array(triesLeft)].map((_, i) => (
                <FaPalette key={i} className="palette-icon" />
              ))}
            </div>
          </div>

          {!showResults ? (
            <>
              <Swiper
                loop={true}
                onSlideChange={handleSwipe}
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                }}
              >
                {imagePairs.map((pair, index) => (
                  <SwiperSlide key={index}>
                    <div className="image-pair-container">
                      {pair.images.map((image, idx) => (
                        <div
                          key={idx}
                          className={`image-container ${selections[currentIndex]?.selected === image ? 'selected' : ''}`}
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
          ) : (
            <div className="results">
              <h2>You got {correctCount}/5 correct!</h2>
              <p>{triesLeft > 0 ? `You have ${triesLeft} tries left.` : 'No more tries left. Game over!'}</p>
              {triesLeft > 0 && (
                <button onClick={handleTryAgain} className="try-again-button">
                  Try Again
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="completion-screen">
          <h2>Game Complete!</h2>
          <p>You got {correctCount}/5 correct!</p>

          <div className="thumbnail-grid">
            {imagePairs.map((pair, index) => {
              const selection = selections[index];
              const humanCorrect = selection?.selected === (pair.images[0] === pair.human ? pair.images[0] : pair.images[1]);
              const aiWrong = selection?.selected === (pair.images[0] === pair.human ? pair.images[1] : pair.images[0]);

              return (
                <div key={index} className="pair-thumbnails">
                  <div className={`thumbnail-container ${humanCorrect ? 'correct' : ''}`}>
                    <img src={pair.images[0]} alt={`Top painting for pair ${index + 1}`} />
                  </div>

                  <div className={`thumbnail-container ${aiWrong ? 'wrong' : ''}`}>
                    <img src={pair.images[1]} alt={`Bottom painting for pair ${index + 1}`} />
                  </div>
                </div>
              );
            })}
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

