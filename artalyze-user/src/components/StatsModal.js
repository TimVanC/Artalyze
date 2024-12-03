import React, { useEffect, useState, useRef } from 'react';
import './StatsModal.css';
import { FaTimes, FaShareAlt } from 'react-icons/fa';
import { handleShare } from '../utils/shareUtils';
import CountUp from 'react-countup';

// Dummy Stats for Testing
export const dummyStats = {
    gamesPlayed: 20,
    winPercentage: 75,
    currentStreak: 5,
    maxStreak: 10,
    perfectPuzzles: 8,
    mistakeDistribution: {
        0: 10,
        1: 8,
        2: 6,
        3: 5,
        4: 3,
        5: 0,
    },
};

const StatsModal = ({ isOpen, onClose, stats = dummyStats }) => {
    const [animatedBars, setAnimatedBars] = useState({});
    const [shouldAnimateNumbers, setShouldAnimateNumbers] = useState(false);
    const hasAnimatedStats = useRef(false); // Keeps track of whether the stats animation has occurred

    // Trigger bar animation when overlay is activated
    useEffect(() => {
        if (isOpen) {
            // Set the bars to animate once the modal is opened
            const animated = Object.keys(stats.mistakeDistribution).reduce((acc, key) => {
                acc[key] = stats.mistakeDistribution[key];
                return acc;
            }, {});
            setAnimatedBars(animated);

            // Only animate numbers the first time modal is opened
            if (!hasAnimatedStats.current) {
                setShouldAnimateNumbers(true);
                hasAnimatedStats.current = true; // Mark that animation has occurred
            } else {
                setShouldAnimateNumbers(false);
            }
        }
    }, [isOpen, stats.mistakeDistribution]);

    if (!isOpen) return null;

    // Find the maximum value for scaling bars (at least 1 to prevent division by zero)
    const maxValue = Math.max(1, ...Object.values(stats.mistakeDistribution));

    return (
        <div className="stats-overlay">
            <div className="stats-overlay-content">
                <span className="close-icon" onClick={onClose}>✖</span>
                <h2 className="stats-header">Your Stats</h2>

                {/* Separator Line */}
                {/* <hr className="separator" /> */}

                {/* Top Statistics Overview */}
                <div className="stats-overview">
                    <div className="stat-item">
                        <div className="stat-value">
                            {shouldAnimateNumbers ? (
                                <CountUp start={0} end={stats.gamesPlayed} duration={1.5} />
                            ) : (
                                stats.gamesPlayed
                            )}
                        </div>
                        <div>Completed</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">
                            {shouldAnimateNumbers ? (
                                <CountUp start={0} end={stats.winPercentage} duration={1.5} />
                            ) : (
                                stats.winPercentage
                            )}
                        </div>
                        <div>Win %</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">
                            {shouldAnimateNumbers ? (
                                <CountUp start={0} end={stats.currentStreak} duration={1.5} />
                            ) : (
                                stats.currentStreak
                            )}
                        </div>
                        <div>Current Streak</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">
                            {shouldAnimateNumbers ? (
                                <CountUp start={0} end={stats.maxStreak} duration={1.5} />
                            ) : (
                                stats.maxStreak
                            )}
                        </div>
                        <div>Max Streak</div>
                    </div>
                </div>

                {/* Separator Line */}
                <hr className="separator" />

                {/* Perfect Puzzles */}
                <div className="perfect-puzzles">
                    <div className="stat-item">
                        <div className="stat-value">
                            {shouldAnimateNumbers ? (
                                <CountUp start={0} end={stats.perfectPuzzles} duration={1.5} />
                            ) : (
                                stats.perfectPuzzles
                            )}
                        </div>
                        <div>Perfect Puzzles</div>
                    </div>
                </div>

                {/* Separator Line */}
                <hr className="separator" />

                {/* Mistake Distribution */}
                <div className="mistake-distribution">
                    <h3>Mistake Distribution</h3>
                    {Object.keys(stats.mistakeDistribution).map((mistakeCount) => {
                        const value = animatedBars[mistakeCount] || 0;
                        // Calculating bar width proportional to max value, with a minimum of 7% for visibility
                        const barWidth = Math.max((value / maxValue) * 100, 5);

                        return (
                            <div className="distribution-bar-container" key={mistakeCount}>
                                <span className="mistake-label">{mistakeCount}</span>
                                <div className="distribution-bar">
                                    <div
                                        className="bar-fill"
                                        style={{
                                            width: `${barWidth}%`,
                                            minWidth: '5%',
                                            backgroundColor: "#4d73af",
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: value === 0 ? 'center' : 'flex-end',
                                            transition: 'width 1s ease-out',
                                            paddingRight: value > 0 ? '5px' : '0', // Add right padding only if value > 0
                                        }}
                                    >
                                        <span
                                            className="bar-value"
                                            style={{
                                                color: "#ffffff",
                                                marginRight: value > 0 ? "5px" : "0", // Add margin only if value > 0
                                            }}
                                        >
                                            {value}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Separator Line */}
                <hr className="separator" />

                {/* Share Button */}
                <button className="share-button" onClick={() => handleShare(stats)}>
                    <FaShareAlt /> Share
                </button>
            </div>
        </div>
    );
};

export default StatsModal;
