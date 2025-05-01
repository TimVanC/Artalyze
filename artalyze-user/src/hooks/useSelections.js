import { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { getTodayInEST } from '../utils/dateUtils';

const useSelections = (userId, isLoggedIn) => {
  const [selections, setSelections] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [alreadyGuessed, setAlreadyGuessed] = useState([]);
  const [completedSelections, setCompletedSelections] = useState([]);
  const [completedAttempts, setCompletedAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user's game progress from backend or localStorage
  useEffect(() => {
    const fetchSelections = async () => {
      try {
        setIsLoading(true);
        const { data } = await axiosInstance.get('/stats/selections', {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        console.log('Fetched game progress from backend:', data);

        const today = getTodayInEST();
        if (data.lastSelectionMadeDate !== today) {
          console.log("Last selection made on a previous day. Resetting game progress.");

          // Only reset state if there are values to clear
          if (selections.length > 0) setSelections([]);
          if (attempts.length > 0) setAttempts([]);
          if (completedSelections.length > 0) setCompletedSelections([]);
          if (completedAttempts.length > 0) setCompletedAttempts([]);
          if (alreadyGuessed.length > 0) setAlreadyGuessed([]);

          await axiosInstance.put("/stats/selections", {
            selections: [],
            attempts: [],
            completedSelections: [],
            completedAttempts: [],
            lastSelectionMadeDate: today
          });

        } else {
          // Update state only when data has changed
          if (JSON.stringify(data.selections || []) !== JSON.stringify(selections)) {
            setSelections(data.selections || []);
          }
          if (JSON.stringify(data.attempts || []) !== JSON.stringify(attempts)) {
            setAttempts(data.attempts?.map(attempt => attempt.map(selected => !!selected)) || []);
          }
          if (JSON.stringify(data.completedSelections || []) !== JSON.stringify(completedSelections)) {
            setCompletedSelections(data.completedSelections || []);
          }
          if (JSON.stringify(data.completedAttempts || []) !== JSON.stringify(completedAttempts)) {
            setCompletedAttempts(data.completedAttempts || []);
          }
          if (JSON.stringify(data.alreadyGuessed || []) !== JSON.stringify(alreadyGuessed)) {
            setAlreadyGuessed(data.alreadyGuessed || []);
          }

          // Update localStorage with latest data
          localStorage.setItem("attempts", JSON.stringify(data.attempts || []));
          localStorage.setItem("completedSelections", JSON.stringify(data.completedSelections || []));
          localStorage.setItem("completedAttempts", JSON.stringify(data.completedAttempts || []));
          localStorage.setItem("alreadyGuessed", JSON.stringify(data.alreadyGuessed || []));
        }
      } catch (err) {
        console.error('Error fetching game progress:', err);
        setError('Failed to fetch game progress. Please try again later.');
        setSelections([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchSelections();
    } else {
      // Load guest user's game progress from localStorage
      const savedSelections = localStorage.getItem('selections');
      const savedAttempts = localStorage.getItem('attempts');
      const savedCompletedSelections = localStorage.getItem('completedSelections');
      const savedCompletedAttempts = localStorage.getItem('completedAttempts');
      const savedAlreadyGuessed = localStorage.getItem('alreadyGuessed');
      const lastSelectionMadeDate = localStorage.getItem('lastSelectionMadeDate');
      const today = getTodayInEST();

      if (lastSelectionMadeDate !== today) {
        console.log("Last selection made on a previous day. Resetting guest game progress.");

        localStorage.setItem('selections', JSON.stringify([]));
        localStorage.setItem('attempts', JSON.stringify([]));
        localStorage.setItem('completedSelections', JSON.stringify([]));
        localStorage.setItem('completedAttempts', JSON.stringify([]));
        localStorage.setItem('alreadyGuessed', JSON.stringify([]));
        localStorage.setItem('lastSelectionMadeDate', today);

        setSelections([]);
        setAttempts([]);
        setCompletedSelections([]);
        setCompletedAttempts([]);
        setAlreadyGuessed([]);
      } else {
        setSelections(savedSelections ? JSON.parse(savedSelections) : []);
        setAttempts(savedAttempts ? JSON.parse(savedAttempts) : []);
        setCompletedSelections(savedCompletedSelections ? JSON.parse(savedCompletedSelections) : []);
        setCompletedAttempts(savedCompletedAttempts ? JSON.parse(savedCompletedAttempts) : []);
        setAlreadyGuessed(savedAlreadyGuessed ? JSON.parse(savedAlreadyGuessed) : []);
      }
      setIsLoading(false);
    }
  }, [userId, isLoggedIn]);

  // Save game progress locally and sync with backend if logged in
  const updateSelections = (updatedSelections) => {
    const today = getTodayInEST();
    if (JSON.stringify(updatedSelections) === JSON.stringify(selections)) {
      console.log("Game progress is already up-to-date. Skipping update.");
      return;
    }

    setSelections(updatedSelections);

    if (isLoggedIn) {
      axiosInstance
        .put("/stats/selections", {
          selections: updatedSelections,
          lastSelectionMadeDate: today,
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        })
        .then(() => console.log("Game progress saved to backend."))
        .catch((err) => console.error("Error saving game progress:", err));
    } else {
      localStorage.setItem("selections", JSON.stringify(updatedSelections));
      localStorage.setItem("lastSelectionMadeDate", today);
    }
  };

  return {
    selections, updateSelections,
    attempts, setAttempts,
    completedSelections, setCompletedSelections,
    completedAttempts, setCompletedAttempts,
    alreadyGuessed, setAlreadyGuessed,
    isLoading, error
  };
};

export default useSelections;
