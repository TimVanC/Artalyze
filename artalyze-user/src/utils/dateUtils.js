// artalyze-user/src/utils/dateUtils.js
export const getTodayInEST = () => {
    const estDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return estDate.split('/').reverse().join('-'); // Convert to YYYY-MM-DD format
  };
  
  export const getYesterdayInEST = () => {
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const estDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(yesterday);
    return estDate.split('/').reverse().join('-'); // Convert to YYYY-MM-DD format
  };
  