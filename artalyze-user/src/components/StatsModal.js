import React from 'react';
import './StatsModal.css'; // Link to the updated CSS we added
import { FaTimes, FaShareAlt } from 'react-icons/fa'; // Importing FaShareAlt for the Share button
import { handleShare } from '../utils/shareUtils';

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
    if (!isOpen) return null;

    // Find the maximum value for scaling bars (at least 1 to prevent division by zero)
    const maxValue = Math.max(1, ...Object.values(stats.mistakeDistribution));

    return (
        <div className="stats-overlay">
            <div className="stats-overlay-content">
                <span className="close-icon" onClick={onClose}>✖</span>
                <h2 className="stats-header">Your Stats</h2>

                {/* Separator Line */}
                <hr className="separator" />

                {/* Top Statistics Overview */}
                <div className="stats-overview">
                    <div className="stat-item">
                        <div className="stat-value">{stats.gamesPlayed}</div>
                        <div>Completed</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{stats.winPercentage}</div>
                        <div>Win %</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{stats.currentStreak}</div>
                        <div>Current Streak</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{stats.maxStreak}</div>
                        <div>Max Streak</div>
                    </div>
                </div>

                {/* Separator Line */}
                <hr className="separator" />

                {/* Perfect Puzzles */}
                <div className="perfect-puzzles">
                    <div className="stat-item">
                        <div className="stat-value">{stats.perfectPuzzles}</div>
                        <div>Perfect Puzzles</div>
                    </div>
                </div>

                {/* Separator Line */}
                <hr className="separator" />

                {/* Mistake Distribution */}
                <div className="mistake-distribution">
                    <h3>Mistake Distribution</h3>
                    {Object.keys(stats.mistakeDistribution).map((mistakeCount) => {
                        const value = stats.mistakeDistribution[mistakeCount];
                        // Calculating bar width proportional to max value, with a minimum of 7% for visibility
                        const barWidth = Math.max((value / maxValue) * 100, 7);

                        return (
                            <div className="distribution-bar-container" key={mistakeCount}>
                                <span className="mistake-label">{mistakeCount}</span>
                                <div className="distribution-bar">
                                    <div
                                        className="bar-fill"
                                        style={{
                                            width: `${barWidth}%`,
                                            minWidth: '7%', // Ensures even value 0 has a visible width
                                            backgroundColor: "#4d73af", // Use blue color directly for filled bars
                                            display: 'flex',
                                            alignItems: 'center', // Vertically center the value
                                            justifyContent: value === 0 ? 'center' : 'flex-end', // Right align for non-zero values, center if value is 0
                                            paddingRight: value > 0 ? "5px" : "0", // Add padding if the value is greater than 0 for spacing
                                        }}
                                    >
                                        <span
                                            className="bar-value"
                                            style={{
                                                color: "#ffffff", // Set the value to white, consistent with others
                                                textAlign: value === 0 ? 'center' : 'right', // Text alignment for '0' and non-zero values
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
