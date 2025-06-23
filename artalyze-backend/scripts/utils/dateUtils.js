/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  formatDate
}; 