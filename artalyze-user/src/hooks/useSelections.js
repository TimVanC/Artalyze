import { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';

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
        setSelections(data.selections || []); // Restore selections
      } catch (err) {
        console.error('Error fetching selections:', err);
        setSelections([]); // Fallback to empty selections
      } finally {
        setIsLoading(false);
      }
    };
  
    if (isLoggedIn) {
      fetchSelections();
    } else {
      const savedSelections = localStorage.getItem('selections');
      console.log('Selections from localStorage:', savedSelections);
      setSelections(savedSelections ? JSON.parse(savedSelections) : []);
      setIsLoading(false);
    }
  }, [userId, isLoggedIn]);
  
  
  // Update selections locally and sync with the backend
  const updateSelections = async (updatedSelections) => {
    if (JSON.stringify(updatedSelections) === JSON.stringify(selections)) {
      console.log("Selections are already up-to-date, skipping update.");
      return; // Prevent infinite loop
    }
  
    setSelections(updatedSelections); // Update local state
  
    try {
      if (isLoggedIn) {
        console.log("Sending selections to backend:", updatedSelections);
        await axiosInstance.put(
          `/stats/selections`,
          { selections: updatedSelections },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );
      } else {
        localStorage.setItem("selections", JSON.stringify(updatedSelections));
      }
    } catch (err) {
      console.error("Error saving selections:", err);
      setError("Failed to save selections.");
    }
  };
  
  

  return { selections, updateSelections, isLoading, error };
};

export default useSelections;
