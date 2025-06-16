export const calculatePuzzleNumber = () => {
  // Format current date in EST timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Extract date components
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value - 1; // Convert to 0-based month index
  const day = parts.find(p => p.type === 'day').value;

  const estNow = new Date(year, month, day);

  // Game launch date: June 1, 2024 at midnight EST
  const startDate = new Date(Date.UTC(2024, 5, 1, 5, 0, 0)); // 5:00 AM UTC = Midnight EST

  // Calculate days since launch to get current puzzle number
  const puzzleNumber = Math.floor((estNow - startDate) / (1000 * 60 * 60 * 24)) + 1;

  return puzzleNumber;
};
