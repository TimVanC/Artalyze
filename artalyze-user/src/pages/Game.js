import './Game.css';
import React, { useState } from 'react';

const Game = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState([]); // Store user selections
  const [imagePairs, setImagePairs] = useState([
    { human: 'http://localhost:5000/uploads/1726714251565-Human1.png', ai: 'http://localhost:5000/uploads/1726714251566-Ai1.png' },
    { human: 'http://localhost:5000/uploads/1726721778860-Human2.png', ai: 'http://localhost:5000/uploads/1726721778862-Ai2.png' },
    { human: 'http://localhost:5000/uploads/1726776698480-Human3.png', ai: 'http://localhost:5000/uploads/1726776698482-Ai3.png' },
    { human: 'http://localhost:5000/uploads/1726776822901-Human4.png', ai: 'http://localhost:5000/uploads/1726776822911-Ai4.png' },
    { human: 'http://localhost:5000/uploads/1726776839120-Human5.png', ai: 'http://localhost:5000/uploads/1726776839129-Ai5.png' },
  ]);
  const [triesLeft, setTriesLeft] = useState(3); // Start with 3 tries
  const [correctCount, setCorrectCount] = useState(0); // Track correct selections
  const [isGameComplete, setIsGameComplete] = useState(false); // Game completion flag
  const [showResults, setShowResults] = useState(false); // Flag to show results after each attempt

  const handleSelection = (selectedImage, isHumanSelection) => {
    const newSelection = { selected: selectedImage, isHumanSelection };
    const updatedSelections = [...selections];
    updatedSelections[currentIndex] = newSelection;
    setSelections(updatedSelections);

    if (currentIndex + 1 < imagePairs.length) {
      setCurrentIndex(currentIndex + 1);
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

  const handleSwipe = (direction) => {
    if (direction === 'next' && currentIndex + 1 < imagePairs.length) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'prev' && currentIndex - 1 >= 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isSubmitEnabled = selections.length === imagePairs.length;

  return (
    <div className="game-container">
      <h1>Guess the Human Painting</h1>

      {!isGameComplete ? (
        <>
          <div className="status-bar">
            <p>Correct Selections: {correctCount}/5</p>
            <p>Tries Left: {triesLeft}</p>
          </div>

          {!showResults ? (
            <>
              <div className="image-pair-container">
                <div
                  className={`image-container ${selections[currentIndex]?.selected === imagePairs[currentIndex].human ? 'selected' : ''}`}
                  onClick={() => handleSelection(imagePairs[currentIndex].human, true)}
                >
                  <img src={imagePairs[currentIndex].human} alt="Human" />
                </div>
                <div
                  className={`image-container ${selections[currentIndex]?.selected === imagePairs[currentIndex].ai ? 'selected' : ''}`}
                  onClick={() => handleSelection(imagePairs[currentIndex].ai, false)}
                >
                  <img src={imagePairs[currentIndex].ai} alt="AI" />
                </div>
              </div>

              <div className="navigation-buttons">
                <button onClick={() => handleSwipe('prev')} disabled={currentIndex === 0}>
                  Previous
                </button>
                <button onClick={() => handleSwipe('next')} disabled={currentIndex + 1 === imagePairs.length}>
                  Next
                </button>
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
              const humanCorrect = selection?.isHumanSelection && selection?.selected === pair.human;
              const humanWrong = selection?.isHumanSelection && selection?.selected !== pair.human;
              const aiWrong = !selection?.isHumanSelection && selection?.selected === pair.ai;

              return (
                <div key={index} className="pair-thumbnails">
                  <div className={`thumbnail-container ${humanCorrect ? 'correct' : ''}`}>
                    <img src={pair.human} alt={`Human selection for pair ${index + 1}`} />
                  </div>
                  <div className={`thumbnail-container ${humanWrong || aiWrong ? 'wrong' : ''}`}>
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
