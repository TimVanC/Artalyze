import React, { useEffect, useState, useRef } from 'react';
import './StatsModal.css';
import { FaShareAlt } from 'react-icons/fa';
import { handleShare } from '../utils/shareUtils';
import { getTodayInEST, getYesterdayInEST } from '../utils/dateUtils';
import { calculatePuzzleNumber } from '../utils/puzzleUtils';
import CountUp from 'react-countup';
import logo from '../assets/images/artalyze-logo.png';

const defaultStats = {
  gamesPlayed: 0,
  winPercentage: 0,
  currentStreak: 0,
  maxStreak: 0,
  perfectPuzzles: 0,
  mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  lastPlayedDate: null,
};

const StatsModal = ({
  isOpen,
  onClose,
  stats: initialStats = defaultStats, // Rename the prop to initialStats
  isLoggedIn = false,
  selections = [],
  imagePairs = [],
  correctCount = 0,
  isGameComplete = false, // Accept isGameComplete as a prop
}) => {
  const userId = localStorage.getItem('userId');
  const [stats, setStats] = useState(initialStats); // Use stats for local state
  const [animatedBars, setAnimatedBars] = useState({});
  const [shouldAnimateNumbers, setShouldAnimateNumbers] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const touchStartY = useRef(null);
  const hasAnimatedStats = useRef(false);
  const totalQuestions = imagePairs.length;

  // Fetch stats and update state
  useEffect(() => {
    const fetchAndValidateStats = async () => {
      try {
        const userIdFromStorage = localStorage.getItem("userId");
        const resolvedUserId = userId || userIdFromStorage;

        if (!resolvedUserId) {
          console.warn("User ID is missing. Cannot fetch stats.");
          return;
        }

        const response = await fetch(`/api/stats/${resolvedUserId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }

        const updatedStats = await response.json();
        console.log("Fetched stats from backend:", updatedStats);

        setStats(updatedStats); // Update the local state
        setAnimatedBars(updatedStats.mistakeDistribution || {});
        setShouldAnimateNumbers(true);
      } catch (error) {
        console.error("Error fetching or validating stats:", error);
      }
    };

    if (isOpen && isLoggedIn) {
      console.log(`StatsModal opened.`);
      fetchAndValidateStats();
    }
  }, [isOpen, isLoggedIn, userId]);


  const handleHistoricalStatsShare = () => {
    const shareableText = `
🎨 Artalyze Stats 🎨
Games Played: ${stats.gamesPlayed}
Win %: ${stats.winPercentage}%
Current Streak: ${stats.currentStreak}
Max Streak: ${stats.maxStreak}
Perfect Streak: ${stats.perfectStreak}
Max Perfect Streak: ${stats.maxPerfectStreak}
Perfect Games: ${stats.perfectPuzzles}
    `;

    if (navigator.share) {
      navigator
        .share({
          title: 'My Artalyze Stats',
          text: shareableText,
        })
        .catch((error) => console.log('Error sharing:', error));
    } else {
      navigator.clipboard
        .writeText(shareableText)
        .then(() => {
          alert('Stats copied to clipboard! You can now paste it anywhere.');
        })
        .catch((error) => {
          console.error('Failed to copy:', error);
        });
    }
  };

  const handleCompletionShare = () => {

    console.log("Selections:", selections); // Add this log
    console.log("Image Pairs:", imagePairs); // Add this log

    if (!selections.length || !imagePairs.length) {
      alert("No data available to share today's puzzle!");
      return;
    }

    const puzzleNumber = calculatePuzzleNumber();

    const resultsVisual = selections
      .map((selection, index) => {
        // Check if the selected image matches the human image
        const isCorrect = selection?.selected === imagePairs[index]?.human;
        return isCorrect ? '🟢' : '🔴';
      })
      .join(' ');


    const paintings = '🖼️ '.repeat(imagePairs.length).trim();

    const shareableText = `
  Artalyze #${puzzleNumber} ${correctCount}/${imagePairs.length}
  ${resultsVisual}
  ${paintings}
  Try it at: artalyze.app
    `;

    if (navigator.share) {
      navigator
        .share({
          title: `Artalyze #${puzzleNumber}`,
          text: shareableText.trim(),
        })
        .catch((error) => console.log('Error sharing:', error));
    } else {
      navigator.clipboard
        .writeText(shareableText.trim())
        .then(() => {
          alert('Results copied to clipboard! You can now paste it anywhere.');
        })
        .catch((error) => console.error('Failed to copy:', error));
    }
  };



  if (!isOpen && !isDismissing) return null;

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsDismissing(false); // Reset state
      onClose(); // Trigger modal close
    }, 400); // Match the CSS animation duration
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    const touchEndY = e.touches[0].clientY;
    if (touchStartY.current && touchEndY - touchStartY.current > 50) {
      handleDismiss(); // Trigger slide-down animation when swipe is detected
    }
  };

  const maxValue = Math.max(1, ...Object.values(stats.mistakeDistribution));

  return (
    <div
      className={`stats-overlay ${isDismissing ? "transparent" : ""}`}
      onTouchStart={handleTouchStart} // Detect the start of the swipe
      onTouchMove={handleTouchMove} // Detect the swipe-down gesture
    >
      <div className={`stats-overlay-content ${isDismissing ? "slide-down" : ""}`}>
        <span className="close-icon" onClick={handleDismiss}>
          ✖
        </span>
        {isLoggedIn ? (
          <>
            <h2 className="stats-header">Your Stats</h2>
            <div className="stats-overview">
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.gamesPlayed || 0} duration={3} />
                  ) : (
                    stats.gamesPlayed || 0
                  )}
                </div>
                <div>Completed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.winPercentage || 0} duration={3} />
                  ) : (
                    stats.winPercentage || 0
                  )}
                </div>
                <div>Win %</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.currentStreak || 0} duration={3} />
                  ) : (
                    stats.currentStreak || 0
                  )}
                </div>
                <div>Current Streak</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.maxStreak || 0} duration={3} />
                  ) : (
                    stats.maxStreak || 0
                  )}
                </div>
                <div>Max Streak</div>
              </div>
            </div>
            <hr className="separator" />
            <div className="stats-overview">
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.perfectStreak || 0} duration={3} />
                  ) : (
                    stats.perfectStreak || 0
                  )}
                </div>
                <div>Perfect Streak</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.maxPerfectStreak || 0} duration={3} />
                  ) : (
                    stats.maxPerfectStreak || 0
                  )}
                </div>
                <div>Max Perfect Streak</div>
              </div>
            </div>
            <div className="perfect-puzzles">
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.perfectPuzzles || 0} duration={3} />
                  ) : (
                    stats.perfectPuzzles || 0
                  )}
                </div>
                <div>Perfect Puzzles</div>
              </div>
            </div>
            <hr className="separator" />
            <div className="mistake-distribution">
              <h3>Mistake Distribution</h3>
              {Object.keys(stats.mistakeDistribution).map((mistakeCount) => {
                const value = stats.mistakeDistribution[mistakeCount] || 0;

                // Highlight logic: highlight all bars if the game isn't complete
                const isHighlighted =
                  !isGameComplete ||
                  parseInt(mistakeCount, 10) === stats.mostRecentScore;

                const barWidth = Math.max(
                  (value / Math.max(...Object.values(stats.mistakeDistribution), 1)) * 100,
                  5
                );

                return (
                  <div className="distribution-bar-container" key={mistakeCount}>
                    <span className="mistake-label">{mistakeCount}</span>
                    <div className="distribution-bar">
                      <div
                        className={`bar-fill ${isHighlighted ? 'highlight' : ''} ${value === 0 ? 'zero-value' : ''}`}
                        style={{
                          width: `${barWidth}%`,
                        }}
                      >
                        <span className="bar-value">{value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <hr className="separator" />
            <button
              className="modal-share-button"
              onClick={handleHistoricalStatsShare}
            >
              <FaShareAlt /> Share All Stats
            </button>
            <button
              className="modal-share-today-button"
              onClick={() =>
                handleCompletionShare(
                  stats.mostRecentSelections || [], // Default to empty array
                  stats.mostRecentImagePairs || [] // Default to empty array
                )
              }
            >
              <FaShareAlt /> Share Today's Puzzle
            </button>
          </>
        ) : (
          <div className="guest-stats-content">
            <img
              src={logo}
              alt="Track your stats illustration"
              className="guest-stats-image"
            />
            <h2>Track Your Artalyze Stats</h2>
            <p>
              Register to follow your streaks, total completed puzzles, win rate,
              and more.
            </p>
            <button
              className="cta-button"
              onClick={() => {
                window.location.href = "/register";
              }}
            >
              Create a Free Account
            </button>
          </div>
        )}
      </div>
    </div>
  );


};

export default StatsModal;