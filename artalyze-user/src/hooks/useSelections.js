import { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { getTodayInEST } from '../utils/dateUtils';

const useSelections = (userId, isLoggedIn) => {
  const [selections, setSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch selections from the backend or localStorage
  useEffect(() => {
    const fetchSelections = async () => {
      try {
        setIsLoading(true);
        const { data } = await axiosInstance.get('/stats/selections', {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        console.log('Fetched selections from backend:', data.selections);

        const today = getTodayInEST();
        if (data.lastSelectionMadeDate !== today) {
          console.log("Last selection made on a previous day. Clearing outdated selections.");
          setSelections([]);
          await axiosInstance.put("/stats/selections", { selections: [], lastSelectionMadeDate: today });
        } else {
          setSelections(data.selections || []);
        }
      } catch (err) {
        console.error('Error fetching selections:', err);
        setError('Failed to fetch selections. Please try again later.');
        setSelections([]); // Fallback to empty selections
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchSelections();
    } else {
      const savedSelections = localStorage.getItem('selections');
      const lastSelectionMadeDate = localStorage.getItem('lastSelectionMadeDate');
      const today = getTodayInEST();

      if (lastSelectionMadeDate !== today) {
        console.log("Last selection made on a previous day. Clearing outdated selections.");
        localStorage.setItem('selections', JSON.stringify([]));
        localStorage.setItem('lastSelectionMadeDate', today);
        setSelections([]);
      } else {
        setSelections(savedSelections ? JSON.parse(savedSelections) : []);
      }
      setIsLoading(false);
    }
  }, [userId, isLoggedIn]);

  // Update selections locally and sync with the backend
  const updateSelections = (updatedSelections) => {
    const today = getTodayInEST();
    if (JSON.stringify(updatedSelections) === JSON.stringify(selections)) {
      console.log("Selections are already up-to-date. Skipping update.");
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
        .then(() => console.log("Selections updated successfully in backend."))
        .catch((err) => console.error("Error updating selections:", err));
    } else {
      localStorage.setItem("selections", JSON.stringify(updatedSelections));
      localStorage.setItem("lastSelectionMadeDate", today);
    }
  };

  return { selections, updateSelections, isLoading, error };
};

export default useSelections;
