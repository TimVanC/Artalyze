import './Game.css';
import React, { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';

const Game = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState([]);
  const [imagePairs] = useState([
    { human: 'http://localhost:5000/uploads/1726714251565-Human1.png', ai: 'http://localhost:5000/uploads/1726714251566-Ai1.png' },
    { human: 'http://localhost:5000/uploads/1726721778860-Human2.png', ai: 'http://localhost:5000/uploads/1726721778862-Ai2.png' },
    { human: 'http://localhost:5000/uploads/1726776698480-Human3.png', ai: 'http://localhost:5000/uploads/1726776698482-Ai3.png' },
    { human: 'http://localhost:5000/uploads/1726776822901-Human4.png', ai: 'http://localhost:5000/uploads/1726776822911-Ai4.png' },
    { human: 'http://localhost:5000/uploads/1726776839120-Human5.png', ai: 'http://localhost:5000/uploads/1726776839129-Ai5.png' },
  ]);
  const [triesLeft, setTriesLeft] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);

  const swiperRef = useRef(null);

  // Handle selection
  const handleSelection = (selectedImage, isHumanSelection) => {
    const newSelection = { selected: selectedImage, isHumanSelection };
    const updatedSelections = [...selections];
    updatedSelections[currentIndex] = newSelection;
    setSelections(updatedSelections);

    // Automatically slide to the next pair
    if (swiperRef.current && currentIndex + 1 < imagePairs.length) {
      swiperRef.current.slideNext();
    }

    console.log("Updated Selections: ", updatedSelections);
  };

  // Submit the user's choices
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

    console.log(`Correct selections: ${correct}`);

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

  const isSubmitEnabled = selections.length === imagePairs.length;

  return (
    <div className="game-container">
      <h1>Guess the Human Painting</h1>

      {!isGameComplete ? (
        <>
          <div className="status-bar">
            {hasSubmittedOnce && <p>Correct Selections: {correctCount}/5</p>}
            <p>Tries Left: {triesLeft}</p>
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
                      {/* For selection process */}
                      <div className={`image-container ${selections[currentIndex]?.selected === pair.human ? 'selected' : ''}`} onClick={() => handleSelection(pair.human, true)}>
                        <img src={pair.human} alt="Human painting" />
                      </div>
                      <div className={`image-container ${selections[currentIndex]?.selected === pair.ai ? 'selected' : ''}`} onClick={() => handleSelection(pair.ai, false)}>
                        <img src={pair.ai} alt="AI painting" />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              <div className="navigation-buttons">
                {imagePairs.map((_, index) => (
                  <button
                    key={index}
                    className={`nav-button ${currentIndex === index ? 'active' : ''}`}
                    onClick={() => {
                      if (swiperRef.current) {
                        swiperRef.current.slideToLoop(index);
                      } else {
                        console.error('Swiper reference is undefined.');
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
              const selection = selections[index];  // User's selection for this pair
              const humanCorrect = selection?.selected === pair.human;  // Did they select the human image?
              const aiWrong = selection?.selected === pair.ai;  // Did they select the AI image?

              // Logging for clarity
              console.log(`Pair ${index}: humanCorrect = ${humanCorrect}, aiWrong = ${aiWrong}`);

              return (
                <div key={index} className="pair-thumbnails">
                  {/* If they selected the human image correctly, apply the green border */}
                  <div className={`thumbnail-container ${humanCorrect ? 'correct' : ''}`}>
                    <img src={pair.human} alt={`Human selection for pair ${index + 1}`} />
                  </div>

                  {/* If they selected the AI image thinking it was human, apply the red border */}
                  <div className={`thumbnail-container ${aiWrong ? 'wrong' : ''}`}>
                    <img src={pair.ai} alt={`AI selection for pair ${index + 1}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {triesLeft === 0 ? (
            <p>No more tries left. Game over!</p>
          ) : (
            <p>Congratulations! You've completed the puzzle.</p>
          )}
        </div>

      )}
    </div>
  );
};

export default Game;
