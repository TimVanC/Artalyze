const getTodayInEST = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;

  console.log(`🕒 Debug: Detected TODAY in EST as: ${year}-${month}-${day}`); // Debugging line
  return `${year}-${month}-${day}`;
};

const getYesterdayInEST = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1); // Subtract 1 day

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
};

module.exports = { getTodayInEST, getYesterdayInEST };
