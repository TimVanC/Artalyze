// utils/shareUtils.js

export const handleShare = (stats) => {
    const shareableText = `
      🎨 Artalyze Stats 🎨
      Games Played: ${stats.gamesPlayed}
      Win %: ${stats.winPercentage}%
      Current Streak: ${stats.currentStreak}
      Max Streak: ${stats.maxStreak}
      Perfect Puzzles: ${stats.perfectPuzzles}
  
      Mistake Distribution:
      ${Object.entries(stats.mistakeDistribution)
        .map(([mistake, count]) => `${mistake}: ${count}`)
        .join('\n')}
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
  