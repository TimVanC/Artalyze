export const handleShare = (selections, imagePairs) => {
  // Format game results for sharing
  const shareableText = `
    Artalyze Results
    ${selections
      .map((isHumanSelection, index) => {
        const pair = imagePairs[index];
        return `Pair ${index + 1}: ${isHumanSelection ? 'Correct' : 'Wrong'} (${pair.human})`;
      })
      .join('\n')}
  `;

  // Try native sharing first, fallback to clipboard if not available
  if (navigator.share) {
    navigator
      .share({
        title: 'My Artalyze Results',
        text: shareableText,
      })
      .catch((error) => console.log('Error sharing:', error));
  } else {
    navigator.clipboard
      .writeText(shareableText)
      .then(() => {
        alert('Results copied to clipboard! You can now paste it anywhere.');
      })
      .catch((error) => {
        console.error('Failed to copy:', error);
      });
  }
};
