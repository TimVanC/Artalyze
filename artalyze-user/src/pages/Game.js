import React, { useState, useEffect, useRef } from 'react';
import ReactGA from "react-ga4";
import { useNavigate } from 'react-router-dom';
import { FaInfoCircle, FaChartBar, FaCog, FaShareAlt, FaLongArrowAltRight, FaLongArrowAltLeft } from 'react-icons/fa';
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
  const lastTapTime = useRef(0);
  const singleTapTimeout = useRef(null);
  const [showSwipeOverlay, setShowSwipeOverlay] = useState(false);
  const [showSwipeRightOverlay, setShowSwipeRightOverlay] = useState(false);
  const [showSwipeLeftOverlay, setShowSwipeLeftOverlay] = useState(false);
  const [hasSeenSwipeLeft, setHasSeenSwipeLeft] = useState(false);
  const [showDoubleTapOverlay, setShowDoubleTapOverlay] = useState(false);
  const [hasSeenDoubleTap, setHasSeenDoubleTap] = useState(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [hasSeenSwipeOverlays, setHasSeenSwipeOverlays] = useState(() => {
    return localStorage.getItem("hasSeenSwipeOverlays") === "true";
  });


  const [userId, setUserId] = useState(localStorage.getItem("userId"));
  const { selections = [], updateSelections, isLoading, error: selectionsError } = useSelections(userId, isLoggedIn);
  const [completedSelections, setCompletedSelections] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [completedAttempts, setCompletedAttempts] = useState([]);
  const [alreadyGuessed, setAlreadyGuessed] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateOverlay, setShowDuplicateOverlay] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  const [imageLoading, setImageLoading] = useState({});

  const [stats, setStats] = useState({
    gamesPlayed: 0,
    winPercentage: 0,
    currentStreak: 0,
    maxStreak: 0,
    perfectPuzzles: 0,
    mistakeDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    lastPlayedDate: null,
  });

  const getMidTurnMessage = (correctCount) => {
    if (correctCount === 0 || correctCount === 1) {
      return "None or only one is right.";
    } else if (correctCount === 2) {
      return "You're three away.";
    } else if (correctCount === 3) {
      return "You're two away.";
    } else if (correctCount === 4) {
      return "Close! You're one away.";
    } else {
      return "";
    }
  };

  // Helper function to save triesRemaining to localStorage
  const saveTriesToLocalStorage = (tries) => {
    localStorage.setItem('triesRemaining', tries);
  };

  // Handle game completion
  const handleGameComplete = async () => {
    console.log("🏁 handleGameComplete called");
    setIsGameComplete(true);

    const formattedAttempts = attempts.map(attempt =>
      attempt.map(selected => selected === true) // Ensures correct boolean values
    );

    const updatedCompletedAttempts = [...completedAttempts, ...formattedAttempts];
    setCompletedAttempts(updatedCompletedAttempts);
    localStorage.setItem("completedAttempts", JSON.stringify(updatedCompletedAttempts));

    if (isUserLoggedIn()) {
      try {
        await axiosInstance.put("/stats/completed-attempts", { completedAttempts: updatedCompletedAttempts });
        console.log("✅ Completed attempts saved in backend.");
      } catch (error) {
        console.error("❌ Error saving completed attempts:", error);
      }
    }

    // ✅ Reset attempts for the next game
    setAttempts([]);
    localStorage.setItem("attempts", JSON.stringify([]));

    if (isUserLoggedIn()) {
      await axiosInstance.put("/stats/attempts", { attempts: [] });
    }


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

      // ✅ Restore attempts and completedAttempts for guest users
      if (!isUserLoggedIn()) {
        const storedAttempts = localStorage.getItem("attempts");
        const storedCompletedAttempts = localStorage.getItem("completedAttempts");

        if (storedAttempts) {
          setAttempts(JSON.parse(storedAttempts));
        }

        if (storedCompletedAttempts) {
          setCompletedAttempts(JSON.parse(storedCompletedAttempts));
        }
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

          if (statsResponse.data.attempts) {
            console.log("✅ Restoring attempts from backend.");

            const parsedAttempts = statsResponse.data.attempts.map(attempt =>
              Array.isArray(attempt) ? attempt.map(selected => selected === true || selected === "true") : []
            ); // ✅ Ensure values remain booleans

            setAttempts(parsedAttempts);
            localStorage.setItem("attempts", JSON.stringify(parsedAttempts));
          } else {
            console.log("⚠️ No attempts found, keeping previous state.");

            const storedAttempts = localStorage.getItem("attempts");
            if (storedAttempts) {
              try {
                setAttempts(JSON.parse(storedAttempts));
              } catch (error) {
                console.error("⚠️ Error parsing stored attempts, resetting to empty:", error);
                setAttempts([]);
              }
            }
          }

          if (statsResponse.data.completedAttempts) {
            setCompletedAttempts(statsResponse.data.completedAttempts);
            localStorage.setItem("completedAttempts", JSON.stringify(statsResponse.data.completedAttempts));
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

      // ✅ **Ensure selections, attempts, completedSelections, and completedAttempts reset properly if LSMD is outdated**
      if (!lastSelectionMadeDate || lastSelectionMadeDate !== today) {
        console.log("🆕 New puzzle detected. Resetting selections, attempts, completedSelections, and completedAttempts BEFORE updating LSMD.");

        // **Clear localStorage before making API call**
        localStorage.removeItem("selections");
        localStorage.removeItem("completedSelections"); // ✅ Reset completedSelections for new puzzle
        localStorage.removeItem("attempts");
        localStorage.removeItem("completedAttempts");
        localStorage.removeItem("alreadyGuessed");

        userSelections = [];
        userCompletedSelections = [];
        setAttempts([]);
        setCompletedSelections([]); // ✅ Reset completedSelections in state
        setCompletedAttempts([]);
        setAlreadyGuessed([]);

        console.log("🗑️ Selections, attempts, completedSelections, and completedAttempts cleared:", userSelections);

        if (isLoggedIn) {
          await axiosInstance.put("/stats/selections", { selections: [], attempts: [], completedSelections: [], completedAttempts: [], lastSelectionMadeDate: today });
        } else {
          localStorage.setItem("selections", JSON.stringify([]));
          localStorage.setItem("attempts", JSON.stringify([]));
          localStorage.setItem("completedSelections", JSON.stringify([])); // ✅ Reset completedSelections for guests
          localStorage.setItem("completedAttempts", JSON.stringify([])); // ✅ Reset completedAttempts for guests
          localStorage.setItem("alreadyGuessed", JSON.stringify([]));
          localStorage.setItem("lastSelectionMadeDate", today);
        }

        console.log(`✅ LSMD Updated to ${today}`);
      } else {
        console.log("✅ Persisting selections, attempts, completedSelections, and completedAttempts as LSMD matches today's date.");
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
        const getRandomizedPairs = (pairs) => {
          console.log("🎲 Randomizing pairs:", pairs);
          return pairs.map((pair) => ({
            human: pair.humanImageURL,
            ai: pair.aiImageURL,
            images: Math.random() > 0.5
              ? [pair.humanImageURL, pair.aiImageURL]
              : [pair.aiImageURL, pair.humanImageURL],
          }));
        };

        // Always use fresh data, don't rely on cache
        console.log("🎲 Fetching and randomizing new image pairs.");
        const randomizedPairs = getRandomizedPairs(puzzleResponse.data.imagePairs);
        console.log("🎲 Randomized pairs:", randomizedPairs);
        setImagePairs(randomizedPairs);
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
    const hasPlayedBefore = localStorage.getItem("hasPlayedBefore");

    if (!hasPlayedBefore) {
      setIsInfoOpen(true); // Show info modal for first-time users
      localStorage.setItem("hasPlayedBefore", "true"); // Mark that they have played
    }
  }, []);

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

  useEffect(() => {
    const disableZoom = (event) => {
      if (!document.querySelector(".zoomable")) {
        if (event.ctrlKey || event.metaKey || event.deltaY) {
          event.preventDefault();
        }
      }
    };
  
    const disableTouchZoom = (event) => {
      if (!event.target.closest(".zoomable")) {
        event.preventDefault();
      }
    };
  
    const disableContextMenu = (event) => {
      event.preventDefault();
    };
  
    // Prevent right-click (context menu)
    document.addEventListener("contextmenu", disableContextMenu);
  
    // Prevent zooming gestures except on .zoomable images
    document.addEventListener("wheel", disableZoom, { passive: false });
    document.addEventListener("keydown", disableZoom);
    document.addEventListener("gesturestart", disableTouchZoom);
    document.addEventListener("gesturechange", disableTouchZoom);
  
    return () => {
      document.removeEventListener("contextmenu", disableContextMenu);
      document.removeEventListener("wheel", disableZoom);
      document.removeEventListener("keydown", disableZoom);
      document.removeEventListener("gesturestart", disableTouchZoom);
      document.removeEventListener("gesturechange", disableTouchZoom);
    };      
  }, []);

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
      // Existing logic for updating Swiper
      setTimeout(() => {
        if (swiperRef.current) {
          console.log("Updating Swiper to current index:", currentIndex);
          swiperRef.current.slideToLoop(currentIndex, 0);
        }
      }, 100);

      // 🔄 **New Image Preloading Logic**
      const loadingState = {};
      imagePairs.forEach((pair, index) => {
        pair.images.forEach((image, position) => {
          loadingState[`${index}-${position}`] = true; // Mark as loading
          const img = new Image();
          img.src = image;
          img.onload = () => handleImageLoad(index, position);
          img.onerror = () => handleImageError(index, position);
        });
      });
      setImageLoading((prev) => ({ ...prev, ...loadingState }));
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
      const parsedCompletedSelections = savedCompletedSelections ? JSON.parse(savedCompletedSelections) : [];

      // ✅ Prevent infinite loop: Only restore if necessary
      if (completedSelections.length === 0 && parsedCompletedSelections.length > 0) {
        console.log("Restoring completedSelections from localStorage for guest user.");
        setCompletedSelections(parsedCompletedSelections);
      }
      // ✅ Prevent unnecessary updates: Only save to localStorage if values have actually changed
      else if (completedSelections.length > 0 && JSON.stringify(completedSelections) !== JSON.stringify(parsedCompletedSelections)) {
        console.log("Persisting completedSelections to localStorage for guest user.");
        localStorage.setItem("completedSelections", JSON.stringify(completedSelections));
      }
    } else if (isLoggedIn && isGameComplete) {
      console.log("Syncing completedSelections with backend...");
      saveCompletedSelectionsToBackend(completedSelections);
    }
  }, [completedSelections, isLoggedIn, isGameComplete]);

  // ✅ Existing useEffect that resets completedSelections when a new day starts
  useEffect(() => {
    const today = getTodayInEST();
    const lastPlayedDate = localStorage.getItem("lastPlayedDate");

    if (!isGameComplete && lastPlayedDate !== today) {
      console.log("New day detected. Resetting completedSelections and completedAttempts.");

      // ✅ Reset completedSelections
      setCompletedSelections([]);
      localStorage.removeItem("completedSelections");

      // ✅ Reset completedAttempts
      setCompletedAttempts([]);
      localStorage.removeItem("completedAttempts");

      if (isUserLoggedIn()) {
        console.log("📡 Resetting completedSelections and completedAttempts in the backend...");
        axiosInstance.put(`/stats/completed-selections/${userId}`, { completedSelections: [] })
          .then(() => console.log("✅ completedSelections reset in backend"))
          .catch(error => console.error("❌ Error resetting completedSelections in backend:", error));

        axiosInstance.put(`/stats/completed-attempts`, { completedAttempts: [] })
          .then(() => console.log("✅ completedAttempts reset in backend"))
          .catch(error => console.error("❌ Error resetting completedAttempts in backend:", error));
      }
    }
  }, [isGameComplete]);

  useEffect(() => {
    const today = getTodayInEST();
    const lastSelectionMadeDate = localStorage.getItem("lastSelectionMadeDate");

    // ✅ Reset attempts[] if lastSelectionMadeDate is outdated
    if (!lastSelectionMadeDate || lastSelectionMadeDate !== today) {
      console.log("🌅 New day detected. Resetting attempts for guest user.");
      setAttempts([]);
      localStorage.setItem("attempts", JSON.stringify([]));
      localStorage.setItem("lastSelectionMadeDate", today);
    }
  }, [isGameComplete]); // ✅ Ensure it re-triggers after a game completes  

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
    const updatedSelections = [...selections];

    // Ensure index exists before updating
    if (!updatedSelections[currentIndex]) {
      updatedSelections[currentIndex] = { selected: null, isHumanSelection: false };
    }

    // Toggle selection (if clicked again, it removes selection)
    if (updatedSelections[currentIndex].selected === selectedImage) {
      updatedSelections[currentIndex] = null;
    } else {
      updatedSelections[currentIndex] = { selected: selectedImage, isHumanSelection };
    }

    updateSelections(updatedSelections);
    localStorage.setItem("selections", JSON.stringify(updatedSelections));

    // ✅ Force Submit Button State Update
    const isAllSelected = updatedSelections.filter(Boolean).length === imagePairs.length;
    if (isAllSelected) {
      document.querySelector(".submit-button").classList.add("enabled");
    } else {
      document.querySelector(".submit-button").classList.remove("enabled");
    }

    // Check if user has seen overlays before
    const hasSeenOverlays = localStorage.getItem("hasSeenOverlays") === "true";

    if (!hasSeenOverlays) {
      // Show "Swipe right" overlay only on first selection of first image pair
      if (!showSwipeRightOverlay && updatedSelections.filter(Boolean).length === 1 && currentIndex === 0) {
        setShowSwipeRightOverlay(true);
        setTimeout(() => setShowSwipeRightOverlay(false), 2000);
      }
    }
  };


  const handleSwipe = (swiper) => {
    setCurrentIndex(swiper.realIndex);

    // Check if user has seen overlays before
    const hasSeenOverlays = localStorage.getItem("hasSeenOverlays") === "true";

    if (!hasSeenOverlays) {
      // Show "Swipe left to go back" overlay after the first swipe (only once)
      if (!hasSeenSwipeLeft && swiper.realIndex > 0) {
        setShowSwipeLeftOverlay(true);
        setTimeout(() => setShowSwipeLeftOverlay(false), 2000);
        setHasSeenSwipeLeft(true);
      }

      // Show "Double tap to enlarge" overlay after the second swipe (only once)
      if (!hasSeenDoubleTap && swiper.realIndex > 1) {
        setShowDoubleTapOverlay(true);
        setTimeout(() => setShowDoubleTapOverlay(false), 2000);
        setHasSeenDoubleTap(true);
      }

      // Show "Tap info icon for more help" overlay after the fourth swipe (only once)
      if (!showInfoOverlay && swiper.realIndex > 2) {
        setShowInfoOverlay(true);
        setTimeout(() => {
          setShowInfoOverlay(false);
          // Mark overlays as seen after all have displayed
          localStorage.setItem("hasSeenOverlays", "true");
        }, 2000);
      }
    }
  };

  const handleCompletionShare = () => {
    // Ensure completedSelections, alreadyGuessed, and imagePairs are available
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

    const formattedGuesses = completedAttempts
      .map(attempt => attempt
        .map((selected) => (selected ? "🟢" : "🔴"))
        .join(" ")
      ).join("\n");

    // Build the final attempt separately
    const finalAttempt = completedSelections
      .map((selection, index) => (selection?.selected === imagePairs[index]?.human ? "🟢" : "🔴"))
      .join(" ");

    // Add placeholder for painting emojis
    const paintings = "🖼️ ".repeat(imagePairs.length).trim();

    // Construct the shareable text with ALL ATTEMPTS properly included
    const shareableText = `Artalyze #${puzzleNumber} ${score}/${imagePairs.length}\n${formattedGuesses}\n${finalAttempt}\n${paintings}\n\nCheck it out here:\nhttps://artalyze.app`;

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
      setEnlargedImageMode("game-screen");
    }, 500); // Long press threshold (500ms)
  };

  const handleImageClick = (imageUrl) => {
    if (!imageLoading[imageUrl]) {  // Only open if it's fully loaded
      console.log("Opening enlarged image:", imageUrl);
      setEnlargedImage(imageUrl);
      setEnlargedImageMode("game-screen");
    }
  };

  const handleImageLoad = (index, position) => {
    setImageLoading((prev) => ({ ...prev, [`${index}-${position}`]: false }));
  };

  const handleImageError = (index, position) => {
    console.error(`Failed to load image at index ${index}, position ${position}`);
    setImageLoading((prev) => ({ ...prev, [`${index}-${position}`]: false }));
  };

  const preloadImages = (imagePairs) => {
    const loadingState = {};
    imagePairs.forEach((pair, index) => {
      pair.images.forEach((image, position) => {
        loadingState[`${index}-${position}`] = true; // Mark as loading
        const img = new Image();
        img.src = image;
        img.onload = () => handleImageLoad(index, position);
        img.onerror = () => handleImageError(index, position);
      });
    });
    setImageLoading((prev) => ({ ...prev, ...loadingState }));
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

    ReactGA.event({
      category: "Game",
      action: "Submit Button Clicked",
      label: "User submitted a game attempt",
    });

    // ✅ Convert current submission into booleans
    const currentSubmission = selections.map((selection, index) => selection.selected === imagePairs[index].human);

    // ✅ Ensure attempts and alreadyGuessed are correctly restored and checked
    const storedAttempts = localStorage.getItem("attempts");
    const storedAlreadyGuessed = localStorage.getItem("alreadyGuessed");

    const parsedAttempts = storedAttempts ? JSON.parse(storedAttempts) : attempts;
    const parsedAlreadyGuessed = storedAlreadyGuessed ? JSON.parse(storedAlreadyGuessed) : alreadyGuessed;

    // ✅ Allow submission if it's a perfect attempt (all correct)
    const isPerfectAttempt = currentSubmission.every((selected) => selected === true);

    // ✅ Ensure the duplicate check correctly references restored attempts
    const isDuplicateSubmission = [...parsedAlreadyGuessed, ...parsedAttempts].some(
      (pastAttempt) => JSON.stringify(pastAttempt.map(Boolean)) === JSON.stringify(currentSubmission.map(Boolean))
    );

    if (isDuplicateSubmission && !isPerfectAttempt) {
      console.log("⛔ Duplicate full submission detected! Showing overlay.");
      setShowDuplicateOverlay(true);
      setTimeout(() => setShowDuplicateOverlay(false), 1000);
      setIsSubmitting(false);
      return;
    }

    // ✅ Store `currentSubmission` in `attempts` as booleans but leave `alreadyGuessed[]` unchanged
    const updatedGuesses = [...parsedAlreadyGuessed, selections.map(selection => selection.selected)];
    const updatedAttempts = [...parsedAttempts, currentSubmission.map(Boolean)]; // ✅ Ensures booleans are stored

    setAlreadyGuessed(updatedGuesses);
    setAttempts(updatedAttempts);

    localStorage.setItem("alreadyGuessed", JSON.stringify(updatedGuesses));
    localStorage.setItem("attempts", JSON.stringify(updatedAttempts));

    console.log("✅ Submission stored in alreadyGuessed and attempts:", updatedGuesses, updatedAttempts);

    if (isUserLoggedIn()) {
      try {
        await axiosInstance.put("/stats/already-guessed", { alreadyGuessed: updatedGuesses });
        await axiosInstance.put("/stats/attempts", { attempts: updatedAttempts });
        console.log("✅ alreadyGuessed and attempts updated in backend.");
      } catch (error) {
        console.error("❌ Error updating alreadyGuessed/attempts:", error);
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

      // ✅ Move attempts to completedAttempts upon game completion
      const updatedCompletedAttempts = [...completedAttempts, ...updatedAttempts];

      setCompletedAttempts(updatedCompletedAttempts);
      localStorage.setItem("completedAttempts", JSON.stringify(updatedCompletedAttempts));

      if (isUserLoggedIn()) {
        try {
          await axiosInstance.put("/stats/completed-attempts", { completedAttempts: updatedCompletedAttempts });
          console.log("✅ Completed attempts saved in backend.");
        } catch (error) {
          console.error("❌ Error saving completed attempts:", error);
        }
      }

      // ✅ Reset attempts for next game
      setAttempts([]);
      localStorage.setItem("attempts", JSON.stringify([]));

      if (isUserLoggedIn()) {
        await axiosInstance.put("/stats/attempts", { attempts: [] });
      }

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

  const isSubmitEnabled = imagePairs.length > 0 && selections.filter(Boolean).length === imagePairs.length;

  return (
    <div className={`game-container ${darkMode ? "dark-mode" : ""}`}>

      {/* Swipe Right Overlay */}
      {showSwipeRightOverlay && (
        <div className="swipe-overlay">
          <span>Swipe right</span>
          <FaLongArrowAltRight className="swipe-arrow" />
        </div>
      )}

      {/* Swipe Left Overlay */}
      {showSwipeLeftOverlay && (
        <div className="swipe-overlay">
          <FaLongArrowAltLeft className="swipe-arrow" />
          <span>Swipe left to go back</span>
        </div>
      )}

      {/* Double Tap Overlay */}
      {showDoubleTapOverlay && (
        <div className="double-tap-overlay">
          <span>Double tap to enlarge image</span>
        </div>
      )}

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

      {/* Info Overlay (Shows after fourth swipe) */}
      {showInfoOverlay && (
        <div className="info-overlay">
          <span>Tap <FaInfoCircle className="info-icon" /> for more help</span>
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
        <div className="app-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Artalyze
        </div>
        <div className="icons-right">
          <FaInfoCircle
            className="icon"
            title="Info"
            onClick={() => {
              setIsInfoOpen(true);

              // ✅ Track Info icon click in Google Analytics
              ReactGA.event({
                category: "Icons",
                action: "Info Icon Clicked",
                label: "User opened the info modal",
              });
            }}
          />

          <FaChartBar
            className="icon"
            title="Stats"
            onClick={() => {
              setIsStatsOpen(true);

              // ✅ Track Stats icon click in Google Analytics
              ReactGA.event({
                category: "Icons",
                action: "Stats Icon Clicked",
                label: "User opened the stats modal",
              });
            }}
          />

          <FaCog
            className="icon"
            title="Settings"
            onClick={() => {
              setIsSettingsOpen(true);

              // ✅ Track Settings icon click in Google Analytics
              ReactGA.event({
                category: "Icons",
                action: "Settings Icon Clicked",
                label: "User opened the settings modal",
              });
            }}
          />
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
        attempts={completedAttempts} // ✅ Ensure attempts are passed
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isLoggedIn={Boolean(localStorage.getItem('authToken'))}
      />

      {!isGameComplete && (
        <>
          <h1 className="game-header">Guess the human artwork from each pair!</h1>

          {/* Tries Left Section (Above Image Pairs) */}
          <div className="tries-left">
            <span>Tries Left:</span>
            {[...Array(triesLeft)].map((_, i) => (
              <span key={i} className="tries-circle"></span>
            ))}
          </div>

          {/* Image Pairs */}
          {imagePairs && imagePairs.length > 0 ? (
            <>
              {console.log("🎨 Rendering Swiper with imagePairs:", imagePairs)}
              <Swiper
                loop={true}
                onSlideChange={handleSwipe}
                onSwiper={(swiper) => {
                  console.log("🎯 Swiper initialized with ref:", swiper);
                  swiperRef.current = swiper;
                  swiper.slideToLoop(0);
                }}
              >
                {imagePairs.map((pair, index) => {
                  console.log(`🖼️ Rendering pair ${index}:`, pair);
                  return (
                    <SwiperSlide key={index}>
                      <div className="image-pair-container">
                        {pair.images.map((image, idx) => (
                          <div
                            key={idx}
                            className={`image-container ${selections[index]?.selected === image ? "selected" : ""}`}
                          >
                            {imageLoading[`${index}-${idx}`] && <div className="image-loader"></div>}
                            <img
                              src={image}
                              alt={`Painting ${idx + 1}`}
                              onClick={(e) => {
                                const currentTime = new Date().getTime();
                                const timeSinceLastTap = currentTime - lastTapTime.current;

                                if (timeSinceLastTap < 300) {
                                  clearTimeout(singleTapTimeout.current);
                                  if (!enlargedImage) {
                                    setEnlargedImage(null);
                                    setTimeout(() => {
                                      setEnlargedImage(image);
                                      setEnlargedImageMode("game-screen");
                                    }, 10);
                                  }
                                } else {
                                  singleTapTimeout.current = setTimeout(() => {
                                    handleSelection(image, image === pair.human);
                                  }, 220);
                                }

                                lastTapTime.current = currentTime;
                              }}
                              draggable="false"
                              onLoad={() => handleImageLoad(index, idx)}
                              onError={() => handleImageError(index, idx)}
                              style={{ visibility: imageLoading[`${index}-${idx}`] ? "hidden" : "visible" }}
                            />
                          </div>
                        ))}
                      </div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </>
          ) : (
            <p>Loading...</p>
          )}

          {/* Status Bar (Clear Left, Navigation Center, Submit Right) */}
          <div className="status-bar">
            <button
              className={`clear-button ${selections.length > 0 ? 'enabled' : ''}`}
              onClick={() => {
                if (selections.length > 0) {
                  updateSelections([]);
                  localStorage.removeItem("selections");

                  // ✅ Track the "Clear Selections" event in Google Analytics
                  ReactGA.event({
                    category: "Game",
                    action: "Clear Selections Clicked",
                    label: "User cleared their selections",
                  });

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

            {/* Navigation Buttons Centered */}
            <div className="nav-buttons">
              {console.log("🎯 Rendering navigation buttons for pairs:", imagePairs)}
              {imagePairs.map((_, index) => (
                <button
                  key={index}
                  className={`nav-button ${currentIndex === index ? 'active' : ''} ${selections[index]?.selected ? 'selected' : ''}`}
                  onClick={() => {
                    console.log(`🔄 Navigating to pair ${index}`);
                    setCurrentIndex(index);
                    swiperRef.current.slideToLoop(index);

                    // Track navigation button clicks in Google Analytics
                    ReactGA.event({
                      category: "Navigation",
                      action: "Nav Button Clicked",
                      label: `User navigated to image pair ${index + 1}`,
                      value: index + 1,
                    });
                  }}
                  aria-label={`Go to image pair ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              className={`submit-button ${isSubmitEnabled ? 'enabled' : 'disabled'}`}
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
            >
              Submit
            </button>
          </div>

          {/* Enlarged Image Modal */}
          {enlargedImage && (
            <div className="enlarge-modal" onClick={closeEnlargedImage}>
              <div className="enlarged-image-container" onClick={(e) => e.stopPropagation()}>
                <div className="zoom-wrapper">
                  <img
                    src={enlargedImage}
                    alt="Enlarged view"
                    className="enlarged-image zoomable"
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.preventDefault()}
                    draggable="false"
                  />
                </div>
                {enlargedImageMode === "game-screen" && (
                  <>
                    <div className="swiper-button-prev" onClick={(e) => {
                      e.stopPropagation();
                      const currentPair = imagePairs[currentIndex];
                      if (currentPair) {
                        const currentImageIndex = currentPair.images.indexOf(enlargedImage);
                        const newImageIndex = currentImageIndex === 0 ? 1 : 0;
                        setEnlargedImage(currentPair.images[newImageIndex]);
                      }
                    }}>&#8592;</div>
                    <div className="swiper-button-next" onClick={(e) => {
                      e.stopPropagation();
                      const currentPair = imagePairs[currentIndex];
                      if (currentPair) {
                        const currentImageIndex = currentPair.images.indexOf(enlargedImage);
                        const newImageIndex = currentImageIndex === 0 ? 1 : 0;
                        setEnlargedImage(currentPair.images[newImageIndex]);
                      }
                    }}>&#8594;</div>
                  </>
                )}
              </div>
            </div>
          )}

        </>
      )}

      {showOverlay && (
        <div className="mid-turn-overlay">
          <div className="mid-turn-overlay-content">
            <h2 className="mid-turn-overlay-title">{getMidTurnMessage(correctCount)}</h2>
            <p className="mid-turn-overlay-message">You have {triesLeft} tries left</p>
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

          {/* Completion Message - Now Above Buttons and Score Badge */}
          <p className="completion-message">
            <strong>
              {correctCount === 5
                ? "Perfect score!"
                : correctCount === 0
                  ? "Better luck next time!"
                  : `You'll get it next time!`}
            </strong>
          </p>

          {/* Top Header with Stats, Score Badge, and Share Button */}
          <div className="completion-header">
            <button
              className="stats-button compact"
              onClick={() => {
                setIsStatsOpen(true);

                // ✅ Track Stats button click in Google Analytics
                ReactGA.event({
                  category: "Completion Screen",
                  action: "Stats Button Clicked",
                  label: "User opened game stats",
                });
              }}
            >
              <FaChartBar /> Stats
            </button>

            <span
              className={`completion-score-badge compact ${correctCount === 5
                ? "five-correct"
                : correctCount === 4
                  ? "four-correct"
                  : correctCount === 3
                    ? "three-correct"
                    : correctCount === 2
                      ? "two-correct"
                      : correctCount === 1
                        ? "one-correct"
                        : "zero-correct"
                }`}
              style={{ flexShrink: 0 }}
            >
              Score: {correctCount}/5
            </span>

            <button
              className="share-button compact"
              onClick={() => {
                handleCompletionShare();

                // ✅ Track Share button click in Google Analytics
                ReactGA.event({
                  category: "Completion Screen",
                  action: "Share Button Clicked",
                  label: "User shared game results",
                });
              }}
            >
              <FaShareAlt /> Share
            </button>
          </div>

          {/* Thumbnail Grid - Two Rows for Large Screens, Single Column for Mobile */}
          <div className="horizontal-thumbnail-grid">
            {/* First Row: First 3 Image Pairs */}
            <div className="first-row">
              {imagePairs.slice(0, 3).map((pair, index) => {
                const selection = completedSelections[index];
                const isCorrect = selection?.selected === pair.human;
                return (
                  <div key={index} className="pair-thumbnails-horizontal">
                    <div
                      className={`thumbnail-container human ${isCorrect ? "correct pulse" : ""}`}
                      onClick={() => setEnlargedImage(pair.human)}
                    >
                      <img src={pair.human} alt={`Human ${index + 1}`} draggable="false" />
                    </div>
                    <div
                      className={`thumbnail-container ai ${!isCorrect && selection ? "incorrect pulse" : ""}`}
                      onClick={() => setEnlargedImage(pair.ai)}
                    >
                      <img src={pair.ai} alt={`AI ${index + 1}`} draggable="false" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Second Row: Last 2 Image Pairs */}
            <div className="second-row">
              {imagePairs.slice(3, 5).map((pair, index) => {
                const selection = completedSelections[index + 3];
                const isCorrect = selection?.selected === pair.human;
                return (
                  <div key={index + 3} className="pair-thumbnails-horizontal">
                    <div
                      className={`thumbnail-container human ${isCorrect ? "correct pulse" : ""}`}
                      onClick={() => setEnlargedImage(pair.human)}
                    >
                      <img src={pair.human} alt={`Human ${index + 4}`} draggable="false" />
                    </div>
                    <div
                      className={`thumbnail-container ai ${!isCorrect && selection ? "incorrect pulse" : ""}`}
                      onClick={() => setEnlargedImage(pair.ai)}
                    >
                      <img src={pair.ai} alt={`AI ${index + 4}`} draggable="false" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


        </div>
      )}

    </div>
  );

};

export default Game;