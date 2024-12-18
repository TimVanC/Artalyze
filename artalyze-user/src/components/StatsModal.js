import React, { useEffect, useState, useRef } from 'react';
import './StatsModal.css';
import { FaShareAlt } from 'react-icons/fa';
import { handleShare } from '../utils/shareUtils';
import CountUp from 'react-countup';
import logo from '../assets/images/artalyze-logo.png';

const defaultStats = {
  gamesPlayed: 0,
  winPercentage: 0,
  currentStreak: 0,
  maxStreak: 0,
  perfectPuzzles: 0,
  mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  mostRecentScore: null, // Added mostRecentScore field
  lastPlayedDate: null,
};

const StatsModal = ({ isOpen, onClose, stats = defaultStats, isLoggedIn = false }) => {
  const [animatedBars, setAnimatedBars] = useState({});
  const [shouldAnimateNumbers, setShouldAnimateNumbers] = useState(false);
  const hasAnimatedStats = useRef(false);

  useEffect(() => {
    if (isOpen) {
      console.log(`StatsModal opened. isLoggedIn: ${isLoggedIn}`);
      const animated = Object.keys(stats.mistakeDistribution).reduce((acc, key) => {
        acc[key] = stats.mistakeDistribution[key];
        return acc;
      }, {});
      setAnimatedBars(animated);

      // Always trigger animations when modal opens
      setShouldAnimateNumbers(true);
      hasAnimatedStats.current = false;
    }
  }, [isOpen, stats.mistakeDistribution, isLoggedIn]);

  if (!isOpen) {
    return null;
  }

  const maxValue = Math.max(1, ...Object.values(stats.mistakeDistribution));

  return (
    <div className="stats-overlay">
      <div className="stats-overlay-content">
        <span className="close-icon" onClick={onClose}>
          ✖
        </span>
        {isLoggedIn ? (
          <>
            <h2 className="stats-header">Your Stats</h2>
            <div className="stats-overview">
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.gamesPlayed} duration={3} />
                  ) : (
                    stats.gamesPlayed
                  )}
                </div>
                <div>Completed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.winPercentage} duration={3} />
                  ) : (
                    stats.winPercentage
                  )}
                </div>
                <div>Win %</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.currentStreak} duration={3} />
                  ) : (
                    stats.currentStreak
                  )}
                </div>
                <div>Current Streak</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.maxStreak} duration={3} />
                  ) : (
                    stats.maxStreak
                  )}
                </div>
                <div>Max Streak</div>
              </div>
            </div>
            <hr className="separator" />
            <div className="perfect-puzzles">
              <div className="stat-item">
                <div className="stat-value">
                  {shouldAnimateNumbers ? (
                    <CountUp start={0} end={stats.perfectPuzzles} duration={3} />
                  ) : (
                    stats.perfectPuzzles
                  )}
                </div>
                <div>Perfect Puzzles</div>
              </div>
            </div>
            <hr className="separator" />
            <div className="mistake-distribution">
              <h3>Mistake Distribution</h3>
              {Object.keys(stats.mistakeDistribution).map((mistakeCount) => {
                const value = animatedBars[mistakeCount] || 0;
                const isActive = parseInt(mistakeCount, 10) === stats.mostRecentScore;

                console.log(
                  `MistakeCount: ${mistakeCount}, Value: ${value}, isActive: ${isActive}`
                );

                const barWidth = Math.max((value / maxValue) * 100, 5);

                return (
                  <div className="distribution-bar-container" key={mistakeCount}>
                    <span className="mistake-label">{mistakeCount}</span>
                    <div
                      className={`distribution-bar ${isActive ? 'active most-recent' : ''
                        }`}
                    >
                      <div
                        className={`bar-fill ${value === 0 ? 'zero-value' : ''} ${isActive ? 'animate' : ''
                          }`}
                        style={{
                          width: `${barWidth}%`,
                          minWidth: '5%',
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
            <button className="share-button" onClick={() => handleShare(stats)}>
              <FaShareAlt /> Share
            </button>
          </>
        ) : (
          <>
            <img src={logo} alt="Artalyze Logo" className="stats-logo" />
            <h2 className="non-logged-in-message">Track Your Artalyze Stats</h2>
            <p className="non-logged-in-subtext">
              Register to follow your streaks, total completed puzzles, win rate, and more.
            </p>
            <button
              className="cta-button"
              onClick={() => (window.location.href = '/login')}
            >
              Create a Free Account
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default StatsModal;
