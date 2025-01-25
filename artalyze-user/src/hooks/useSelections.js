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
      console.log('Selections from localStorage:', savedSelections);
      setSelections(savedSelections ? JSON.parse(savedSelections) : []);
      setIsLoading(false);
    }
  }, [userId, isLoggedIn]);
  
  
  
  // Update selections locally and sync with the backend
  const updateSelections = (updatedSelections) => {
    // Prevent unnecessary updates
    if (JSON.stringify(updatedSelections) === JSON.stringify(selections)) {
      console.log("Selections are already up-to-date. Skipping update.");
      return; // Avoid redundant updates
    }
  
    setSelections(updatedSelections); // Update local state
  
    // Sync with backend or localStorage
    if (isLoggedIn) {
      axiosInstance
        .put("/stats/selections", { selections: updatedSelections }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        })
        .then(() => console.log("Selections updated successfully in backend."))
        .catch((err) => console.error("Error updating selections:", err));
    } else {
      localStorage.setItem("selections", JSON.stringify(updatedSelections));
    }
  };
  
  
  
  

  return { selections, updateSelections, isLoading, error };
};

export default useSelections;
