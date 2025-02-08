import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaInfoCircle, FaChartBar, FaCog, FaShareAlt, FaPalette } from 'react-icons/fa';
import logo from '../assets/images/artalyze-logo.png';
import SwiperCore, { Swiper, SwiperSlide } from 'swiper/react';
import { getTodayInEST } from '../utils/dateUtils';
import { calculatePuzzleNumber } from '../utils/puzzleUtils';
import 'swiper/css';
import axiosInstance from '../axiosInstance';
import InfoModal from '../components/InfoModal';
import StatsModal from '../components/StatsModal';
import SettingsModal from '../components/SettingsModal';
import useSelections from '../hooks/useSelections';
import axios from 'axios';
import { handleShare } from '../utils/shareUtils';
import './Game.css';

const isUserLoggedIn = () => {
  return !!localStorage.getItem('authToken');
};

const Game = () => {
  const navigate = useNavigate();
  const statsTimerRef = useRef(null);
  const isLoggedIn = isUserLoggedIn();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  // const [selections, setSelections] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [triesLeft, setTriesLeft] = useState(3);
  const [triesRemaining, setTriesRemaining] = useState(3);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [enlargedImageMode, setEnlargedImageMode] = useState("");
  const [enlargedImageIndex, setEnlargedImageIndex] = useState(0);
  const longPressTimer = useRef(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [imagePairs, setImagePairs] = useState([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isDisappearing, setIsDisappearing] = useState(false);
  const [isStatsModalDismissed, setIsStatsModalDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [error, setError] = useState('');
  const swiperRef = useRef(null);

  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const { selections = [], updateSelections, isLoading, error: selectionsError } = useSelections(userId, isLoggedIn);
  const [completedSelections, setCompletedSelections] = useState([]);

  const [alreadyGuessed, setAlreadyGuessed] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateOverlay, setShowDuplicateOverlay] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });


  const [stats, setStats] = useState({
    gamesPlayed: 0,
    winPercentage: 0,
    currentStreak: 0,
    maxStreak: 0,
    perfectPuzzles: 0,
    mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    lastPlayedDate: null,
  });


  // Helper function to save triesRemaining to localStorage
  const saveTriesToLocalStorage = (tries) => {
    localStorage.setItem('triesRemaining', tries);
  };

  // Handle game completion
  const handleGameComplete = async () => {
    console.log("🏁 handleGameComplete called");
    setIsGameComplete(true);

    if (!Array.isArray(selections) || !Array.isArray(imagePairs)) {
      console.error("❌ Invalid data: selections or imagePairs are undefined.");
      return;
    }

    const correctCount = selections.reduce((count, selection, index) => {
      if (selection && imagePairs[index] && selection.selected === imagePairs[index].human) {
        return count + 1;
      }
      return count;
    }, 0);

    console.log("✅ Final Correct Answers Count:", correctCount);
    setCorrectCount(correctCount);
    localStorage.setItem("correctCount", correctCount);

    const updatedCompletedSelections = [...completedSelections, ...selections];
    setCompletedSelections(updatedCompletedSelections);
    localStorage.setItem("completedSelections", JSON.stringify(updatedCompletedSelections)); // ✅ Ensure persistence    

    try {
      const today = getTodayInEST();
      const mistakes = imagePairs.length - correctCount;

      if (isUserLoggedIn()) {
        const payload = {
          correctAnswers: correctCount,
          totalQuestions: imagePairs.length,
          completedSelections: selections,
          mostRecentScore: mistakes,
          lastPlayedDate: today,
          alreadyGuessed: [],
        };

        console.log("📡 Sending stats update to backend:", payload);
        await axiosInstance.put(`/stats/${userId}`, payload);

        console.log("✅ Stats updated successfully in backend");

        console.log("🔄 Resetting triesRemaining to 3...");
        const resetTriesResponse = await axiosInstance.put("/stats/tries/reset");
        console.log("✅ Reset tries response:", resetTriesResponse.data);

        setTriesRemaining(3);
        setTriesLeft(3);

        await fetchAndSetStats(userId);
      } else {
        localStorage.setItem("completedSelections", JSON.stringify(selections)); // ✅ Save for guest users
        localStorage.setItem("triesRemaining", "3");
        localStorage.setItem("lastPlayedDate", today);
        setTriesRemaining(3);
        setTriesLeft(3);
      }

      setAlreadyGuessed([]);
      localStorage.setItem("alreadyGuessed", JSON.stringify([]));

      if (isUserLoggedIn()) {
        await axiosInstance.put("/stats/already-guessed", { alreadyGuessed: [] });
      }
      console.log("✅ alreadyGuessed reset after game completion.");
    } catch (error) {
      console.error("❌ Error updating user stats:", error.response?.data || error.message);
    } finally {
      updateSelections([]);
      localStorage.removeItem("selections");

      setTimeout(() => {
        setIsStatsOpen(true);
        console.log("📊 StatsModal opened after game completion.");
      }, 500);
    }
  };

  // Initialize game logic
  const initializeGame = async () => {
    const today = getTodayInEST();
    const isLoggedIn = isUserLoggedIn();

    if (isLoggedIn && !userId) {
      console.error("User is logged in but no userId found in localStorage.");
      setError("User ID is missing. Please log in again.");
      return;
    }

    try {
      setLoading(true);

      let userSelections = [];
      let userCompletedSelections = [];
      let lastSelectionMadeDate = null;
      let lastTriesMadeDate = null;
      let lastPlayedDate = null;
      let triesRemaining = 3;
      let gameCompletedToday = false;
      let alreadyGuessed = [];

      // ✅ **Restore alreadyGuessed from localStorage on refresh**
      const storedGuesses = localStorage.getItem("alreadyGuessed");
      if (storedGuesses) {
        alreadyGuessed = JSON.parse(storedGuesses);
        setAlreadyGuessed(alreadyGuessed);
      }

      try {
        if (isLoggedIn) {
          console.log("Fetching user selections, tries, and completed selections...");
          const statsResponse = await axiosInstance.get(`/stats/${userId}`);

          userSelections = statsResponse.data.selections || [];
          userCompletedSelections = statsResponse.data.completedSelections || [];
          lastSelectionMadeDate = statsResponse.data.lastSelectionMadeDate;
          lastTriesMadeDate = statsResponse.data.lastTriesMadeDate;
          lastPlayedDate = statsResponse.data.lastPlayedDate;
          triesRemaining = statsResponse.data.triesRemaining;
          gameCompletedToday = lastPlayedDate === today;

          // ✅ **Restore alreadyGuessed from backend if available**
          if (statsResponse.data.alreadyGuessed) {
            alreadyGuessed = statsResponse.data.alreadyGuessed;
            setAlreadyGuessed(alreadyGuessed);
            localStorage.setItem("alreadyGuessed", JSON.stringify(alreadyGuessed));
          }
        } else {
          console.log("Handling guest user selections...");
          const savedSelections = localStorage.getItem("selections");
          const savedCompletedSelections = localStorage.getItem("completedSelections");
          lastSelectionMadeDate = localStorage.getItem("lastSelectionMadeDate");
          lastTriesMadeDate = localStorage.getItem("lastTriesMadeDate");
          lastPlayedDate = localStorage.getItem("lastPlayedDate");
          triesRemaining = parseInt(localStorage.getItem("triesRemaining"), 10) || 3;
          gameCompletedToday = lastPlayedDate === today;

          userSelections = savedSelections ? JSON.parse(savedSelections) : [];
          userCompletedSelections = savedCompletedSelections
            ? JSON.parse(savedCompletedSelections)
            : completedSelections.length > 0
              ? completedSelections
              : [];
        }
      } catch (error) {
        console.error("Error fetching play status:", error);
        lastPlayedDate = localStorage.getItem("lastPlayedDate");
        gameCompletedToday = lastPlayedDate === today;
      }


      console.log(`📅 TODAY: ${today}`);
      console.log(`🔍 LAST SELECTION MADE DATE (LSMD): ${lastSelectionMadeDate}`);
      console.log(`🔍 LAST TRIES MADE DATE (LTMD): ${lastTriesMadeDate}`);

      // ✅ **Reset alreadyGuessed if LSMD is outdated**
      if (!lastSelectionMadeDate || lastSelectionMadeDate !== today) {
        console.log("🔄 LSMD mismatch! Resetting alreadyGuessed to prevent stale data.");
        alreadyGuessed = [];

        if (isLoggedIn) {
          await axiosInstance.put("/stats/already-guessed", { alreadyGuessed: [] });
        } else {
          localStorage.setItem("alreadyGuessed", JSON.stringify([]));
        }
      }

      // ✅ **Lock users on the completion screen if they already finished today's game**
      if (gameCompletedToday) {
        console.log("✅ User already completed today's game. Staying on completion screen.");
        setIsGameComplete(true);
        return;
      }

      // ✅ **Reset triesRemaining if lastPlayedDate is today (game completed)**
      if (lastPlayedDate === today || lastTriesMadeDate !== today) {
        console.log("🔄 Resetting triesRemaining to 3.");
        triesRemaining = 3;
        if (isLoggedIn) {
          await axiosInstance.put("/stats/tries/reset");
        } else {
          localStorage.setItem("triesRemaining", "3");
          localStorage.setItem("lastTriesMadeDate", today);
        }
      }

      // ✅ **Ensure selections reset properly if LSMD is outdated**
      if (!lastSelectionMadeDate || lastSelectionMadeDate !== today) {
        console.log("🆕 New puzzle detected. Resetting selections BEFORE updating LSMD.");

        // **Clear localStorage before making API call**
        localStorage.removeItem("selections");
        localStorage.removeItem("completedSelections");

        userSelections = [];
        userCompletedSelections = [];

        console.log("🗑️ Selections cleared:", userSelections);

        if (isLoggedIn) {
          await axiosInstance.put("/stats/selections", { selections: [], lastSelectionMadeDate: today });
        } else {
          localStorage.setItem("selections", JSON.stringify([]));
          localStorage.setItem("lastSelectionMadeDate", today);
        }

        console.log(`✅ LSMD Updated to ${today}`);
      } else {
        console.log("✅ Persisting selections as LSMD matches today's date.");
      }

      // ✅ **Ensure selections persist across refreshes during active gameplay**
      if (!gameCompletedToday) {
        console.log("Restoring previous selections from localStorage.");
        const savedSelections = localStorage.getItem("selections");
        if (savedSelections) {
          userSelections = JSON.parse(savedSelections);
        }
      }

      // ✅ **Ensure alreadyGuessed does not reset unless game completes**
      if (!gameCompletedToday) {
        const storedGuesses = localStorage.getItem("alreadyGuessed");
        if (storedGuesses) {
          alreadyGuessed = JSON.parse(storedGuesses);
          setAlreadyGuessed(alreadyGuessed);
        }
      }

      // ✅ **Add short delay before updating state to prevent race conditions**
      setTimeout(() => {
        updateSelections(userSelections);
        setCompletedSelections(userCompletedSelections);
        setTriesLeft(triesRemaining);
        setTriesRemaining(triesRemaining);
        setAlreadyGuessed(alreadyGuessed);
      }, 100); // Delay to ensure state updates correctly

      console.log("📡 Fetching daily puzzle...");
      const puzzleResponse = await axiosInstance.get("/game/daily-puzzle");
      console.log("📦 Puzzle Response:", puzzleResponse.data);

      if (puzzleResponse.data?.imagePairs?.length > 0) {
        const pairs = puzzleResponse.data.imagePairs.map((pair) => ({
          human: pair.humanImageURL,
          ai: pair.aiImageURL,
          images: Math.random() > 0.5
            ? [pair.humanImageURL, pair.aiImageURL]
            : [pair.aiImageURL, pair.humanImageURL],
        }));

        console.log("🖼️ Setting imagePairs:", pairs);
        setImagePairs(pairs);
        localStorage.setItem("completedPairs", JSON.stringify(puzzleResponse.data.imagePairs));
      } else {
        console.warn("⚠️ No image pairs available for today.");
        setImagePairs([]);
      }
    } catch (error) {
      console.error("❌ Error initializing game:", error.response?.data || error.message);
      setError("Failed to initialize the game. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Restore game state function
  const restoreGameState = () => {
    console.log("Restoring game state...");
    const savedPairs = localStorage.getItem("completedPairs");
    const savedSelections = localStorage.getItem("selections");
    const savedCompletedSelections = localStorage.getItem("completedSelections");

    console.log("Saved pairs from localStorage:", savedPairs);
    console.log("Saved selections from localStorage:", savedSelections);
    console.log("Saved completedSelections from localStorage:", savedCompletedSelections);

    if (savedPairs) {
      const pairs = JSON.parse(savedPairs);
      setImagePairs(
        pairs.map((pair) => ({
          human: pair.humanImageURL,
          ai: pair.aiImageURL,
          images: Math.random() > 0.5
            ? [pair.humanImageURL, pair.aiImageURL]
            : [pair.aiImageURL, pair.humanImageURL],
        }))
      );

      if (savedSelections) {
        const selections = JSON.parse(savedSelections);
        updateSelections(selections);
        console.log("Restored selections:", selections);
      }

      if (savedCompletedSelections) {
        const completedSelections = JSON.parse(savedCompletedSelections);
        setCompletedSelections(completedSelections);
        console.log("Restored completedSelections:", completedSelections);
      } else {
        console.log("No completedSelections found in localStorage.");
        setCompletedSelections([]);
      }
    } else {
      console.warn("No completed pairs found in localStorage.");
      setImagePairs([]);
      updateSelections([]);
      setCompletedSelections([]);
    }
  };

  // Game logic: Initialize or restore game state based on completion status
  useEffect(() => {
    if (!isGameComplete) {
      console.log("Initializing game...");
      initializeGame();
    } else {
      console.log("Game already completed. Restoring game state...");
      restoreGameState();

      if (imagePairs.length > 0 && selections.length === 0) {
        console.log("Restoring selections for completed game...");
        if (isLoggedIn) {
          restoreSelectionsFromBackend();
        } else {
          const savedSelections = localStorage.getItem("selections");
          if (savedSelections) {
            updateSelections(JSON.parse(savedSelections));
          }
        }
      }

      if (completedSelections.length === 0) {
        console.log("Fetching completed selections...");
        if (isLoggedIn) {
          fetchCompletedSelectionsFromBackend().then((data) => {
            if (data && data.length > 0) {
              setCompletedSelections(data);
            }
          });
        } else {
          const savedCompletedSelections = localStorage.getItem("completedSelections");
          if (savedCompletedSelections) {
            setCompletedSelections(JSON.parse(savedCompletedSelections));
          }
        }
      }
    }
  }, [userId, isGameComplete, imagePairs.length]);

  // Persist isGameComplete state across refreshes
  useEffect(() => {
    if (isGameComplete) {
      console.log("Persisting game completion state to localStorage...");
      localStorage.setItem("isGameComplete", "true");
    } else {
      localStorage.removeItem("isGameComplete");
    }
  }, [isGameComplete]);

  // Restore isGameComplete from localStorage on initial render
  useEffect(() => {
    const storedIsGameComplete = localStorage.getItem("isGameComplete") === "true";
    if (storedIsGameComplete) {
      console.log("Restoring game completion state from localStorage.");
      setIsGameComplete(true);
    }
  }, []);

  useEffect(() => {
    const hasDismissedWarning = localStorage.getItem("dismissedMobileWarning");

    if (!hasDismissedWarning && window.innerWidth >= 1025) {
      setShowMobileWarning(true);
    }
  }, []);

  // Monitor updates to imagePairs
  useEffect(() => {
    console.log("Image pairs state updated:", imagePairs);
    if (imagePairs.length > 0) {
      setTimeout(() => {
        if (swiperRef.current) {
          console.log("Updating Swiper to current index:", currentIndex);
          swiperRef.current.slideToLoop(currentIndex, 0);
        }
      }, 100);
    }
  }, [currentIndex, imagePairs]);

  // Apply animations to thumbnails when the stats modal is dismissed
  useEffect(() => {
    if (isStatsModalDismissed) {
      const elements = document.querySelectorAll(".thumbnail-container.pulse");
      elements.forEach((el, index) => {
        console.log(`Applying animation to element ${index + 1}`);
        el.style.animationDelay = `${index * 0.1}s`;
        el.classList.add("animate-pulse");
      });
      setIsStatsModalDismissed(false); // Reset state after applying animations
    }
  }, [isStatsModalDismissed]);

  // Persist selections for guest users
  useEffect(() => {
    if (!isLoggedIn && selections.length > 0) {
      console.log("Persisting selections to localStorage for guest user.");
      localStorage.setItem("selections", JSON.stringify(selections));
    }
  }, [selections, isLoggedIn]);

  // Persist and restore completedSelections for guest users
  useEffect(() => {
    if (!isLoggedIn) {
      const savedCompletedSelections = localStorage.getItem("completedSelections");

      if (completedSelections.length === 0 && savedCompletedSelections) {
        console.log("Restoring completedSelections from localStorage for guest user.");
        setCompletedSelections(JSON.parse(savedCompletedSelections));
      } else if (completedSelections.length > 0 && JSON.stringify(completedSelections) !== savedCompletedSelections) {
        console.log("Persisting completedSelections to localStorage for guest user.");
        localStorage.setItem("completedSelections", JSON.stringify(completedSelections));
      }
    } else if (isLoggedIn && isGameComplete) {
      console.log("Syncing completedSelections with backend...");
      saveCompletedSelectionsToBackend(completedSelections);
    }
  }, [completedSelections, isLoggedIn, isGameComplete]); // ✅ Ensures proper sync when game is complete 

  // Reset completedSelections when a new day starts
  useEffect(() => {
    const today = getTodayInEST();
    const lastPlayedDate = localStorage.getItem("lastPlayedDate");

    if (!isGameComplete && lastPlayedDate !== today) {
      console.log("New day detected. Resetting completedSelections.");

      setCompletedSelections([]);
      localStorage.removeItem("completedSelections");

      if (isLoggedIn) {
        console.log("📡 Resetting completedSelections in the backend...");
        axiosInstance.put(`/stats/completed-selections/${userId}`, { completedSelections: [] })
          .then(() => console.log("✅ completedSelections reset in backend"))
          .catch(error => console.error("❌ Error resetting completedSelections in backend:", error));
      }
    }
  }, [isGameComplete]);


  // ✅ Now, update `lastPlayedDate` **only when the user actually completes a game**
  useEffect(() => {
    if (isGameComplete) {
      const today = getTodayInEST();
      console.log(`✅ Game completed. Setting lastPlayedDate to ${today}`);
      localStorage.setItem("lastPlayedDate", today);
    }
  }, [isGameComplete]);


  // Prevent re-fetching completedSelections endlessly
  useEffect(() => {
    if (isGameComplete && isLoggedIn && completedSelections.length === 0) {
      console.log("Fetching completed selections after game completion...");
      fetchCompletedSelectionsFromBackend().then((data) => {
        if (data && data.length > 0) {
          console.log("Fetched completed selections from backend:", data);
          if (JSON.stringify(data) !== JSON.stringify(completedSelections)) {
            setCompletedSelections(data); // Update only if there's a difference
          }
        }
      });
    }
  }, [isGameComplete, isLoggedIn, completedSelections.length]);

  // Log selections state updates for debugging
  useEffect(() => {
    console.log("Selections state updated:", selections);
  }, [selections]);

  // Log completedSelections state updates for debugging
  useEffect(() => {
    console.log("CompletedSelections state updated:", completedSelections);
  }, [completedSelections]);

  // Fetch and display stats for the completion screen
  useEffect(() => {
    const fetchStatsForCompletion = async () => {
      if (isLoggedIn && userId && isGameComplete) {
        try {
          console.log("Fetching stats for completion screen...");
          const stats = await fetchAndSetStats(userId);
          if (stats) {
            console.log("Stats fetched successfully:", stats);
            setStats(stats); // Ensure stats state is updated
          }
        } catch (err) {
          console.error("Error fetching stats for completion:", err);
        }
      }
    };

    fetchStatsForCompletion();
  }, [isLoggedIn, userId, isGameComplete]);

  // Restore correctCount from localStorage
  useEffect(() => {
    const storedCorrectCount = localStorage.getItem("correctCount");
    if (storedCorrectCount) {
      setCorrectCount(parseInt(storedCorrectCount, 10));
    }
  }, []);

  // Debugging: Log triesRemaining state updates
  useEffect(() => {
    console.log("Tries remaining:", triesRemaining);
  }, [triesRemaining]);

  // Debugging: Log game completion status updates
  useEffect(() => {
    console.log("Game completion status updated:", isGameComplete);
  }, [isGameComplete]);

  // Lock to completion screen after game completion
  useEffect(() => {
    if (isGameComplete) {
      console.log("Game completed. Redirecting to completion screen.");
    }
  }, [isGameComplete]);

  useEffect(() => {
    const handleStorageChange = () => {
      setDarkMode(localStorage.getItem("darkMode") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);


  const encouragementMessages = [
    "Keep it up!",
    "You're doing great!",
    "Almost there!",
    "Keep pushing!",
    "You're doing awesome!",
  ];

  const getRandomEncouragement = () => {
    const randomIndex = Math.floor(Math.random() * encouragementMessages.length);
    return encouragementMessages[randomIndex];
  };

  const fetchAndSetStats = async (userId) => {
    if (!userId) {
      console.error("No userId found. Please log in again.");
      return;
    }

    try {
      const statsResponse = await axiosInstance.get(`/stats/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      console.log("Fetched user stats:", statsResponse.data);

      // **Trigger re-render by updating the state with new stats**
      setStats((prevStats) => ({
        ...prevStats,
        ...statsResponse.data, // Merge new stats from backend
      }));
    } catch (error) {
      console.error("Error fetching user stats:", error.response?.data || error.message);
    }
  };


  const saveCompletedSelectionsToBackend = async (completedSelections) => {
    const userId = localStorage.getItem("userId");

    if (!userId || !Array.isArray(completedSelections) || completedSelections.length === 0) {
      console.error("Invalid parameters: Cannot save completedSelections. Missing userId or completedSelections is empty.");
      return;
    }

    try {
      const payload = { completedSelections };
      console.log("Saving completedSelections to backend with payload:", payload);

      const response = await axiosInstance.put(`/stats/completed-selections/${userId}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });

      console.log("CompletedSelections successfully saved to backend:", response.data);
    } catch (error) {
      console.error("Error saving completedSelections to backend:", error.response?.data || error.message);
    }
  };

  const fetchCompletedSelectionsFromBackend = async () => {
    try {
      console.log("Fetching completed selections from backend...");
      const response = await axiosInstance.get(`/stats/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });

      const completedSelections = response.data.completedSelections || [];
      setCompletedSelections(completedSelections);
      console.log("Fetched completed selections from backend:", completedSelections);
    } catch (error) {
      console.error("Error fetching completed selections:", error.response?.data || error.message);
    }
  };

  const decrementTries = async () => {
    try {
      if (isUserLoggedIn()) {
        const response = await axiosInstance.put('/stats/tries/decrement', {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        setTriesLeft(response.data.triesRemaining);
        saveTriesToLocalStorage(response.data.triesRemaining); // Persist to localStorage
      } else {
        const newTries = Math.max(triesLeft - 1, 0);
        setTriesLeft(newTries);
        saveTriesToLocalStorage(newTries); // Persist to localStorage
      }
    } catch (error) {
      console.error('Error decrementing tries:', error.response?.data || error.message);
    }
  };

  const restoreSelectionsFromBackend = async () => {
    try {
      const selectionsResponse = await axiosInstance.get("/stats/selections", {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      const restoredSelections = selectionsResponse.data.selections || [];
      updateSelections(restoredSelections); // Update state with restored selections
      console.log("Restored selections:", restoredSelections);
    } catch (error) {
      console.error("Error restoring selections:", error);
    }
  };

  const saveSelectionsToLocalStorage = (selections) => {
    localStorage.setItem('selections', JSON.stringify(selections));
  };

  const handleSelection = (selectedImage, isHumanSelection) => {
    console.log("Image clicked:", selectedImage, "Is human:", isHumanSelection);

    const updatedSelections = [...selections];
    updatedSelections[currentIndex] = {
      selected: selectedImage,
      isHumanSelection,
    };

    console.log("Updated selections:", updatedSelections);

    // Update selections in both the database and local storage
    updateSelections(updatedSelections);
    localStorage.setItem("selections", JSON.stringify(updatedSelections));

    // Move to the next pair
    setTimeout(() => {
      if (swiperRef.current) {
        const nextIndex = currentIndex + 1 < imagePairs.length ? currentIndex + 1 : 0;
        setCurrentIndex(nextIndex);
        swiperRef.current.slideToLoop(nextIndex);
      }
    }, 200);
  };

  const handleCompletionShare = () => {
    // Ensure completedSelections and imagePairs are available
    if (!completedSelections.length || !imagePairs.length) {
      alert("No data available to share today's puzzle!");
      return;
    }

    // Calculate the score based on completed selections
    const score = completedSelections.reduce((count, selection, index) => {
      if (selection?.selected === imagePairs[index]?.human) {
        return count + 1;
      }
      return count;
    }, 0);

    // Get the puzzle number dynamically
    const puzzleNumber = calculatePuzzleNumber();

    // Build the visual representation of results
    const resultsVisual = completedSelections
      .map((selection, index) => {
        const isCorrect = selection?.selected === imagePairs[index]?.human;
        return isCorrect ? "🟢" : "🔴";
      })
      .join(" ");

    // Add placeholder for painting emojis
    const paintings = "🖼️ ".repeat(imagePairs.length).trim();

    // Construct the shareable text
    const shareableText = `
  Artalyze #${puzzleNumber} ${score}/${imagePairs.length}
  ${resultsVisual}
  ${paintings}
  Try it at: artalyze.app
    `.trim();

    // Check if the device supports native sharing
    if (navigator.share) {
      navigator
        .share({
          title: `Artalyze #${puzzleNumber}`,
          text: shareableText,
        })
        .catch((error) => console.log("Error sharing:", error));
    } else {
      // Fallback to clipboard copy if native sharing is unavailable
      navigator.clipboard
        .writeText(shareableText)
        .then(() => {
          alert("Results copied to clipboard! You can now paste it anywhere.");
        })
        .catch((error) => {
          console.error("Failed to copy:", error);
        });
    }
  };

  const handlePlayClick = () => {
    if (window.innerWidth > 768) { // Targeting laptop/desktop screens
      setShowMobileWarning(true);
      setTimeout(() => {
        setShowMobileWarning(false);
      }, 2000); // Show for 2 seconds
    }
  };


  const handleLongPress = (imageUrl) => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setEnlargedImage(imageUrl);
      setEnlargedImageMode("game-screen"); // Set mode for game screen enlargement
    }, 500); // Long press threshold (500ms)
  };

  const handleImageClick = (imageUrl) => {
    setEnlargedImage(imageUrl);
    setEnlargedImageMode("completion-screen"); // Set mode for completion screen enlargement
  };


  const closeEnlargedImage = () => {
    setEnlargedImage(null);
  };


  const handleRelease = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleSubmit = async () => {
    console.log("📡 Submit button pressed!");

    if (isSubmitting) return; // ✅ Prevent multiple rapid submissions
    setIsSubmitting(true);

    const currentSubmission = selections.map((selection) => selection.selected);

    // ✅ Check if this exact submission was already made
    const isDuplicateSubmission = alreadyGuessed.some(
      (pastSubmission) => JSON.stringify(pastSubmission) === JSON.stringify(currentSubmission)
    );

    if (isDuplicateSubmission) {
      console.log("⛔ Duplicate full submission detected! Showing overlay.");
      setShowDuplicateOverlay(true);
      setTimeout(() => setShowDuplicateOverlay(false), 1000);
      setIsSubmitting(false);
      return;
    }

    // ✅ Store new guess in `alreadyGuessed`
    const updatedGuesses = [...alreadyGuessed, currentSubmission];
    setAlreadyGuessed(updatedGuesses);
    localStorage.setItem("alreadyGuessed", JSON.stringify(updatedGuesses));

    console.log("✅ Submission stored in alreadyGuessed:", updatedGuesses);

    if (isUserLoggedIn()) {
      try {
        await axiosInstance.put("/stats/already-guessed", { alreadyGuessed: updatedGuesses });
        console.log("✅ alreadyGuessed updated in backend.");
      } catch (error) {
        console.error("❌ Error updating alreadyGuessed:", error);
      }
    }

    // ✅ Calculate correct guesses
    let correct = selections.reduce((count, selection, index) => {
      return selection.isHumanSelection && selection.selected === imagePairs[index].human
        ? count + 1
        : count;
    }, 0);

    setCorrectCount(correct);

    // ✅ Check game completion or decrement tries
    if (correct === imagePairs.length || triesLeft === 1) {
      console.log("🏁 Game completed! Correct answers:", correct);
      setIsGameComplete(true);
      setShowOverlay(false);
      handleGameComplete();
    } else {
      console.log("🔄 Guess submitted, but game is NOT complete yet. Showing mid-turn overlay...");
      setShowOverlay(true);
      await decrementTries();
    }

    setIsSubmitting(false);
  };


  const handleStatsModalClose = () => {
    setIsStatsOpen(false);
    setTimeout(() => setIsStatsModalDismissed(true), 300); // Trigger animation after modal close animation
  };

  const isSubmitEnabled = selections.length === imagePairs.length;

  return (
    <div className={`game-container ${darkMode ? "dark-mode" : ""}`}>
      {/* Mobile Warning Overlay */}
      {showMobileWarning && (
        <div className="mobile-warning-overlay">
          <div className="mobile-warning-content">
            <h2><strong>Warning</strong></h2>
            <p>This game is optimized for mobile devices. For the best experience, play on a phone or tablet.</p>
            <button
              className="mobile-warning-dismiss"
              onClick={() => {
                localStorage.setItem("dismissedMobileWarning", "true"); // Store that user dismissed it
                setShowMobileWarning(false);
              }}
            >
              Close
            </button>

          </div>
        </div>
      )}

      {/* Already Guessed Overlay */}
      {showDuplicateOverlay && (
        <div className="duplicate-overlay">
          <div className="duplicate-overlay-content">
            <h2 className="duplicate-overlay-title">You already tried this guess!</h2>
          </div>
        </div>
      )}





      {/* Full Page Loading Screen */}
      {loading && (
        <div className="full-page-loading-screen">
          <img src={logo} alt="Artalyze Logo" className="loading-logo" />
          <div className="full-page-progress-bar">
            <div className="full-page-progress-fill"></div>
          </div>
        </div>
      )}


      {/* Top Bar */}
      <div className="top-bar">
        <div className="app-title">Artalyze</div>
        <div className="icons-right">
          <FaInfoCircle className="icon" title="Info" onClick={() => setIsInfoOpen(true)} />
          <FaChartBar className="icon" title="Stats" onClick={() => setIsStatsOpen(true)} />
          <FaCog className="icon" title="Settings" onClick={() => setIsSettingsOpen(true)} />
        </div>
      </div>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={handleStatsModalClose}
        stats={stats}
        isLoggedIn={isLoggedIn}
        selections={selections}
        imagePairs={imagePairs}
        correctCount={correctCount}
        isGameComplete={isGameComplete}
        completedSelections={completedSelections}
      />




      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isLoggedIn={Boolean(localStorage.getItem('authToken'))}
      />

      {!isGameComplete && (
        <>
          <h1 className="game-header">Guess the human painting from each pair!</h1>

          {/* 
<div className="progress-bar-container">
  <div className="progress-bar">
    {[...Array(5)].map((_, index) => (
      <div
        key={index}
        className="progress-bar-segment"
        style={{
          backgroundColor: selections[index] ? "#4d73af" : "#e0e0e0",  // Fill based on selections
        }}
      />
    ))}
  </div>
</div>
*/}

          <div className={`status-bar ${showOverlay ? 'blurred' : ''}`}>
            <div className="header-separator"></div>  {/* Add space between the header and the tries line */}

            <div className="tries-left">
              <span>Tries Left:</span>
              {[...Array(triesLeft)].map((_, i) => (
                <FaPalette key={i} className="palette-icon" />
              ))}
            </div>
          </div>

          {imagePairs && imagePairs.length > 0 ? (
            <Swiper
              loop={true}
              onSlideChange={(swiper) => setCurrentIndex(swiper.realIndex)}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                swiper.slideToLoop(0);
              }}
            >
              {imagePairs.map((pair, index) => (
                <SwiperSlide key={index}>
                  <div className="image-pair-container">
                    {pair.images && pair.images.length > 0 ? (
                      pair.images.map((image, idx) => (
                        <div
                          key={idx}
                          className={`image-container ${selections[index]?.selected === image ? "selected" : ""}`}
                          onClick={() => handleSelection(image, image === pair.human)}
                          onTouchStart={() => handleLongPress(image)} // Start long press
                          onTouchEnd={handleRelease} // Release long press
                          onMouseDown={() => handleLongPress(image)} // For desktop users
                          onMouseUp={handleRelease} // Release long press on desktop
                        >
                          <img src={image} alt={`Painting ${idx + 1}`} />
                        </div>
                      ))
                    ) : (
                      <p>No images available for this pair.</p>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p>Loading...</p>
          )}

          {enlargedImage && (
            <div className="enlarge-modal" onClick={closeEnlargedImage}>
              <div className="swiper-container">
                <Swiper
                  loop={true}
                  initialSlide={enlargedImageIndex}
                  onSlideChange={(swiper) => setEnlargedImageIndex(swiper.realIndex)}
                  navigation={{
                    prevEl: ".swiper-button-prev",
                    nextEl: ".swiper-button-next",
                  }}
                  slidesPerView={1} // Show only one image per slide
                  spaceBetween={10} // Add some space if needed between slides
                >
                  {imagePairs &&
                    imagePairs.map((pair, index) => (
                      <SwiperSlide key={index}>
                        <div className="enlarged-image-container">
                          {/* Display only one image per slide (human or AI) */}
                          <img
                            src={
                              enlargedImageIndex % 2 === 0 ? pair.human : pair.ai
                            }
                            alt={`Enlarged Painting ${index + 1}`}
                            className="enlarged-image"
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                </Swiper>
              </div>
              <div className="swiper-button-prev">&#8592;</div>
              <div className="swiper-button-next">&#8594;</div>
            </div>
          )}

          <div className="navigation-buttons">
            {imagePairs.map((_, index) => (
              <button
                key={index}
                className={`nav-button ${currentIndex === index ? 'active' : ''} ${selections[index]?.selected ? 'selected' : ''}`}
                onClick={() => {
                  setCurrentIndex(index);
                  swiperRef.current.slideToLoop(index);
                }}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="button-container">
            <button
              className={`clear-button ${selections.length > 0 ? 'enabled' : ''}`}
              onClick={() => {
                if (selections.length > 0) {
                  updateSelections([]);
                  localStorage.removeItem("selections");

                  if (isUserLoggedIn()) {
                    axiosInstance.put(`/stats/selections`, { selections: [] })
                      .then(() => console.log("Selections cleared in backend"))
                      .catch(error => console.error("Error clearing selections:", error));
                  }
                }
              }}
              disabled={selections.length === 0}
            >
              Clear
            </button>

            <button
              className={`submit-button ${isSubmitEnabled ? 'enabled' : 'disabled'}`}
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
            >
              Submit
            </button>
          </div>


        </>
      )}

      {showOverlay && (
        <div className="mid-turn-overlay">
          <div className="mid-turn-overlay-content">
            {correctCount === imagePairs.length - 1 ? ( // ✅ Dynamically check "1 away"
              <>
                <h2 className="mid-turn-overlay-title">Close! You're 1 away</h2>
                <p className="mid-turn-overlay-message">You have {triesLeft} tries left</p>  {/* ✅ Now correct */}
              </>
            ) : correctCount >= 0 && correctCount <= 3 ? (
              <>
                <h2 className="mid-turn-overlay-title">{getRandomEncouragement()}</h2>
                <p className="mid-turn-overlay-message">You have {triesLeft} tries left</p>
              </>
            ) : null}
            <button
              onClick={() => setShowOverlay(false)}
              className="mid-turn-overlay-try-again-button"
            >
              Try Again
            </button>
          </div>
        </div>
      )}



      {isGameComplete && (
        <div className="completion-screen">
          <p className="completion-message">
            <strong>
              {correctCount === 5
                ? "Perfect score!"
                : correctCount === 0
                  ? "Better luck next time!"
                  : `You'll get it next time!`}
            </strong>
          </p>

          <div className="completion-score-container">
            <span
              className={`completion-score-badge ${correctCount === 5
                ? "five-correct"
                : correctCount === 0
                  ? "zero-correct"
                  : ""
                }`}
            >
              {correctCount}/5 correct
            </span>
          </div>

          <div className="horizontal-thumbnail-grid">
            {/* First row: Pairs 1-3 */}
            <div className="first-row">
              {imagePairs.slice(0, 3).map((pair, index) => {
                const selection = completedSelections[index];
                const isCorrect = selection?.selected === pair.human;
                return (
                  <div key={index} className="pair-thumbnails-horizontal">
                    <div
                      className={`thumbnail-container human ${selection?.selected === pair.human ? (isCorrect ? "correct pulse" : "incorrect pulse") : ""}`}
                      onClick={() => setEnlargedImage(pair.human)}
                    >
                      <img src={pair.human} alt={`Human Painting for pair ${index + 1}`} />
                    </div>
                    <div
                      className={`thumbnail-container ai ${selection?.selected === pair.ai ? (isCorrect ? "correct pulse" : "incorrect pulse") : ""}`}
                      onClick={() => setEnlargedImage(pair.ai)}
                    >
                      <img src={pair.ai} alt={`AI Painting for pair ${index + 1}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Second row: Pairs 4-5 */}
            <div className="second-row">
              {imagePairs.slice(3, 5).map((pair, index) => {
                const selection = completedSelections[index + 3];
                const isCorrect = selection?.selected === pair.human;
                return (
                  <div key={index + 3} className="pair-thumbnails-horizontal">
                    <div
                      className={`thumbnail-container human ${selection?.selected === pair.human ? (isCorrect ? "correct pulse" : "incorrect pulse") : ""}`}
                      onClick={() => setEnlargedImage(pair.human)}
                    >
                      <img src={pair.human} alt={`Human Painting for pair ${index + 4}`} />
                    </div>
                    <div
                      className={`thumbnail-container ai ${selection?.selected === pair.ai ? (isCorrect ? "correct pulse" : "incorrect pulse") : ""}`}
                      onClick={() => setEnlargedImage(pair.ai)}
                    >
                      <img src={pair.ai} alt={`AI Painting for pair ${index + 4}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>




          <div className="completion-buttons">
            <button className="stats-button" onClick={() => setIsStatsOpen(true)}>
              <FaChartBar /> See Stats
            </button>
            <button
              className="share-button"
              onClick={() =>
                handleCompletionShare(
                  selections.map((s) => s?.isHumanSelection),
                  imagePairs
                )
              }
            >
              <FaShareAlt /> Share
            </button>
          </div>
        </div>
      )}

      {enlargedImage && (
        <div className={`enlarge-modal ${enlargedImageMode}`} onClick={closeEnlargedImage}>
          <div className="enlarged-image-container">
            <img src={enlargedImage} alt="Enlarged view" className="enlarged-image" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

    </div>
  );

};

export default Game;
