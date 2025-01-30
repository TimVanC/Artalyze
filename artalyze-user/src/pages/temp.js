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

      if (isLoggedIn) {
        console.log("Fetching user selections, tries, and completed selections...");
        const statsResponse = await axiosInstance.get(`/stats/${userId}`);
        userSelections = statsResponse.data.selections || [];
        userCompletedSelections = statsResponse.data.completedSelections || [];
        lastSelectionMadeDate = statsResponse.data.lastSelectionMadeDate;
        lastTriesMadeDate = statsResponse.data.lastTriesMadeDate;
        lastPlayedDate = statsResponse.data.lastPlayedDate;
        triesRemaining = statsResponse.data.triesRemaining;
        gameCompletedToday = lastPlayedDate === today; // Check if game was completed today
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
        userCompletedSelections = savedCompletedSelections ? JSON.parse(savedCompletedSelections) : [];
      }

      // **Lock users on the completion screen if they already finished today's game**
      if (gameCompletedToday) {
        console.log("User already completed today's game. Staying on completion screen.");
        setIsGameComplete(true);
        return; // Prevents loading game logic
      }

      // **Reset triesRemaining if lastPlayedDate is today (game completed)**
      if (lastPlayedDate === today || lastTriesMadeDate !== today) {
        console.log("Resetting triesRemaining to 3.");
        triesRemaining = 3;
        if (isLoggedIn) {
          await axiosInstance.put("/stats/tries/reset");
        } else {
          localStorage.setItem("triesRemaining", "3");
          localStorage.setItem("lastTriesMadeDate", today);
        }
      }

      // **Reset selections if LSMD is outdated**
      if (lastSelectionMadeDate !== today) {
        console.log("Last selection made on a previous day. Clearing selections.");
        userSelections = [];
        userCompletedSelections = [];
        if (isLoggedIn) {
          await axiosInstance.put("/stats/selections", { selections: [], lastSelectionMadeDate: today });
        } else {
          localStorage.setItem("selections", JSON.stringify([]));
          localStorage.setItem("lastSelectionMadeDate", today);
        }
      } else {
        console.log("Selections persist since LSMD matches today's date.");
      }


      updateSelections(userSelections);
      setCompletedSelections(userCompletedSelections);
      setTriesLeft(triesRemaining);
      setTriesRemaining(triesRemaining);

      console.log("Fetching daily puzzle...");
      const puzzleResponse = await axiosInstance.get("/game/daily-puzzle");
      console.log("Puzzle Response:", puzzleResponse.data);

      if (puzzleResponse.data?.imagePairs?.length > 0) {
        const pairs = puzzleResponse.data.imagePairs.map((pair) => ({
          human: pair.humanImageURL,
          ai: pair.aiImageURL,
          images: Math.random() > 0.5
            ? [pair.humanImageURL, pair.aiImageURL]
            : [pair.aiImageURL, pair.humanImageURL],
        }));

        console.log("Setting imagePairs:", pairs);
        setImagePairs(pairs);
        localStorage.setItem("completedPairs", JSON.stringify(puzzleResponse.data.imagePairs));
      } else {
        console.warn("No image pairs available for today.");
        setImagePairs([]); // Ensure state is updated
      }
    } catch (error) {
      console.error("Error initializing game:", error.response?.data || error.message);
      setError("Failed to initialize the game. Please try again later.");
    } finally {
      setLoading(false);
    }
  };