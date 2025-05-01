import { createContext, useState, useEffect, useContext } from "react";

const DarkModeContext = createContext();

export const DarkModeProvider = ({ children }) => {
  // Initialize dark mode state from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    // Fetch user's theme preference from the backend if logged in
    const fetchThemePreference = async () => {
      const userId = localStorage.getItem("userId");
      const userToken = localStorage.getItem("authToken");

      if (userId && userToken) {
        try {
          const response = await fetch(`/api/user/theme`, {
            headers: { Authorization: `Bearer ${userToken}` },
          });

          if (response.ok) {
            const data = await response.json();
            setDarkMode(data.themePreference === "dark");
            localStorage.setItem("darkMode", data.themePreference === "dark");
          }
        } catch (error) {
          console.error("Error fetching theme preference:", error);
        }
      }
    };

    fetchThemePreference();

    // Listen for theme changes from other tabs or components
    const handleStorageChange = () => {
      setDarkMode(localStorage.getItem("darkMode") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("darkModeChanged", handleStorageChange);

    // Clean up event listeners
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("darkModeChanged", handleStorageChange);
    };
  }, []);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

// Custom hook to access dark mode state and setter
export const useDarkMode = () => {
  return useContext(DarkModeContext);
};
