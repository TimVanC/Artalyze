const getTodayInEST = () => {
  const now = new Date();
  // Convert UTC time to EST by subtracting 5 hours
  const estOffset = -5 * 3600000; // EST = UTC - 5 hours
  const estDate = new Date(now.getTime() + estOffset);

  // Format EST date as YYYY-MM-DD
  const year = estDate.getUTCFullYear();
  const month = String(estDate.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(estDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getYesterdayInEST = () => {
  const now = new Date();
  const estOffset = -5 * 3600000; // EST = UTC - 5 hours
  const estDate = new Date(now.getTime() + estOffset - 24 * 3600000); // Subtract 24 hours for yesterday

  // Format EST date as YYYY-MM-DD
  const year = estDate.getUTCFullYear();
  const month = String(estDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(estDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

module.exports = { getTodayInEST, getYesterdayInEST };
