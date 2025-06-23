import React, { useEffect, useState, useRef } from "react";
import ReactGA from "react-ga4";
import { useDarkMode } from "../hooks/useDarkMode";
import "./StatsModal.css";
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
  stats: initialStats = defaultStats,
  isLoggedIn = false,
  selections = [],
  imagePairs = [],
  correctCount = 0,
  isGameComplete = false,
  completedSelections = [],
  attempts = [], // ✅ Add attempts prop
}) => {
  const userId = localStorage.getItem('userId');
  const [stats, setStats] = useState(initialStats);
  const [animatedBars, setAnimatedBars] = useState({});
  const [shouldAnimateNumbers, setShouldAnimateNumbers] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const touchStartY = useRef(null);
  const hasAnimatedStats = useRef(false);
  const totalQuestions = imagePairs.length;
  const [showShareWarning, setShowShareWarning] = useState(false);
  const shareWarningTimeoutRef = useRef(null);
  const { darkMode } = useDarkMode();

  // Load user stats when the modal opens
  useEffect(() => {
    const fetchAndValidateStats = async () => {
      try {
        const userIdFromStorage = localStorage.getItem("userId");
        const resolvedUserId = userId || userIdFromStorage;

        if (!resolvedUserId) {
          console.warn("User ID is missing. Cannot fetch stats.");
          return;
        }

        console.log("Fetching stats when StatsModal opens...");
        // Use dynamic backend URL based on environment
        const isStaging = window.location.hostname.includes('staging') || process.env.NODE_ENV === 'development';
        const baseURL = isStaging 
          ? "https://artalyze-backend-staging.up.railway.app/api"
          : "https://artalyze-backend-production.up.railway.app/api";
        
        const response = await fetch(`${baseURL}/stats/${resolvedUserId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        });

        const text = await response.text();

        try {
          const updatedStats = JSON.parse(text);
          console.log("Fetched stats from backend:", updatedStats);
          setStats(updatedStats);
          setAnimatedBars(updatedStats.mistakeDistribution || {});
          setShouldAnimateNumbers(true);
        } catch (jsonError) {
          console.error("Failed to parse JSON. Raw response:", text);
          throw jsonError;
        }
      } catch (error) {
        console.error("Error fetching or validating stats:", error);
      }
    };

    if (isOpen && isLoggedIn) {
      fetchAndValidateStats();
    }
  }, [isOpen, isLoggedIn, userId]);

  // Clean up share warning timeout on unmount
  useEffect(() => {
    return () => {
      if (shareWarningTimeoutRef.current) {
        clearTimeout(shareWarningTimeoutRef.current);
      }
    };
  }, []);

  // Share historical stats with friends
  const handleHistoricalStatsShare = () => {
    const shareableText = `
    Artalyze Stats
    
    Games Played: ${stats.gamesPlayed}
    Win Rate: ${stats.winPercentage}%
    Current Streak: ${stats.currentStreak}
    Max Streak: ${stats.maxStreak}
    Perfect Streak: ${stats.perfectStreak}
    Max Perfect Streak: ${stats.maxPerfectStreak}
    Perfect Games: ${stats.perfectPuzzles}
    
    Track your stats and play daily:
    https://artalyze.app
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

  // Share today's puzzle results
  const handleCompletionShare = () => {
    // Ensure completedSelections, attempts, and imagePairs are available
    if (!completedSelections.length || !imagePairs.length) {
      alert("No data available to share today's puzzle!");
      return;
    }

    // Calculate the score based on completed selections
    const score = completedSelections.reduce((count, selection, index) => {
      if (selection?.selected === imagePairs[index]?.human) {
        return count + 1;
      }
      return count;
    }, 0);

    // Get the puzzle number dynamically
    const puzzleNumber = calculatePuzzleNumber();

    // Format all attempts (previous guesses)
    const formattedGuesses = attempts
      .map(attempt => attempt
        .map((selected) => (selected ? "🟢" : "🔴"))
        .join(" ")
      ).join("\n");

    // Add the final attempt separately
    const finalAttempt = completedSelections
      .map((selection, index) => (selection?.selected === imagePairs[index]?.human ? "🟢" : "🔴"))
      .join(" ");

    // Add placeholder for painting emojis
    const paintings = "🖼️ ".repeat(imagePairs.length).trim();

    // Construct the shareable text including all attempts
    const shareableText = `Artalyze #${puzzleNumber} ${score}/${imagePairs.length}\n${formattedGuesses}\n${finalAttempt}\n${paintings}\n\nCheck it out here:\nhttps://artalyze.app`;

    // Attempt native sharing first, fallback to clipboard copy
    if (navigator.share) {
      navigator
        .share({
          title: `Artalyze #${puzzleNumber}`,
          text: shareableText,
        })
        .catch((error) => console.log("Error sharing:", error));
    } else {
      navigator.clipboard
        .writeText(shareableText)
        .then(() => {
          alert("Results copied to clipboard! You can now paste it anywhere.");
        })
        .catch((error) => console.error("Failed to copy:", error));
    }
  };


  const shareResults = (usedSelections, allAttempts) => {
    // Ensure we have valid selections, attempts, and image pairs
    if (!usedSelections.length || !imagePairs.length || !allAttempts.length) {
      alert("No data available to share today's puzzle!");
      return;
    }
  
    const puzzleNumber = calculatePuzzleNumber();

    // Calculate the correct count from the final attempt
    const correctCount = usedSelections.reduce((count, selection, index) => {
      return selection?.selected === imagePairs[index]?.human ? count + 1 : count;
    }, 0);

    // Format all attempts visually
    const formattedGuesses = allAttempts
      .map(attempt =>
        attempt.map((selected) => (selected ? "🟢" : "🔴")).join(" ")
      ).join("\n");

    // Add placeholder for painting emojis
    const paintings = "🖼️ ".repeat(imagePairs.length).trim();

    // Construct the shareable text including all attempts
    const shareableText = `Artalyze #${puzzleNumber} ${correctCount}/${imagePairs.length}\n${formattedGuesses}\n${paintings}\n\nCheck it out here:\nhttps://artalyze.app`;

    // Attempt native sharing first, fallback to clipboard copy
    if (navigator.share) {
      navigator
        .share({
          title: `Artalyze #${puzzleNumber}`,
          text: shareableText,
        })
        .catch((error) => console.log("Error sharing:", error));
    } else {
      navigator.clipboard
        .writeText(shareableText)
        .then(() => {
          alert("Results copied to clipboard! You can now paste it anywhere.");
        })
        .catch((error) => console.error("Failed to copy:", error));
    }
  };



  if (!isOpen && !isDismissing) return null;

  // Handle modal dismissal with animation
  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsDismissing(false);
      onClose();
    }, 400);
  };

  // Track touch start position for swipe detection
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  // Handle swipe down to dismiss modal
  const handleTouchMove = (e) => {
    const touchEndY = e.touches[0].clientY;
    if (touchStartY.current && touchEndY - touchStartY.current > 50) {
      handleDismiss();
    }
  };

  // Ensure mistakeDistribution always has valid data
  const maxValue = Math.max(1, ...Object.values(stats.mistakeDistribution || {}));

  return (
    <div
      className={`stats-overlay ${isDismissing ? "transparent" : ""} ${darkMode ? "dark-mode" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className={`stats-overlay-content ${isDismissing ? "slide-down" : ""} ${darkMode ? "dark-mode" : ""}`}>
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
            <div className="stats-overview-second-row">
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
              <h3 className="distribution-header">Mistake Distribution</h3>
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
            <div className="share-buttons-container">
              <button
                className="modal-share-button"
                onClick={() => {
                  handleHistoricalStatsShare();

                  // ✅ Track "Share Stats" button in Google Analytics
                  ReactGA.event({
                    category: "Stats Modal",
                    action: "Shared Lifetime Stats",
                    label: "User shared their lifetime stats from the Stats Modal",
                  });
                }}
              >
                <FaShareAlt className="share-icon" /> Share Stats
              </button>

              <button
                className="modal-share-today-button"
                onClick={() => {
                  handleCompletionShare();

                  // ✅ Track "Share Today" button in Google Analytics
                  ReactGA.event({
                    category: "Stats Modal",
                    action: "Shared Today's Stats",
                    label: "User shared their daily stats from the Stats Modal",
                  });
                }}
              >
                <FaShareAlt className="share-icon" /> Share Today
              </button>

            </div>


          </>
        ) : (
          <div className="guest-stats-content">
            <img
              src={logo}
              alt="Track your stats illustration"
              className="guest-stats-logo"
            />
            <h2 className="guest-message">Track Your Artalyze Stats</h2>
            <p className="guest-subtext">
              Register to follow your streaks, total completed puzzles, win rate,
              and more.
            </p>
            <button
              className="guest-cta-button"
              onClick={() => {
                // ✅ Track Guest CTA Click in Google Analytics
                ReactGA.event({
                  category: "Guest Engagement",
                  action: "Guest Create Account Clicked",
                  label: "Guest user clicked to create a free account",
                });

                window.location.href = "/login";
              }}
            >
              Create a Free Account
            </button>

          </div>

        )}
      </div>
      {/* Custom Share Warning Overlay */}
      {showShareWarning && (
        <div className="share-warning-overlay">
          <div className="share-warning-content">
            <p>Please finish the puzzle to share your results</p>
          </div>
        </div>
      )}

    </div>
  );


};

export default StatsModal;