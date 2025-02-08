import { createContext, useState, useEffect, useContext } from "react";

const DarkModeContext = createContext();

export const DarkModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
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

    const handleStorageChange = () => {
      setDarkMode(localStorage.getItem("darkMode") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("darkModeChanged", handleStorageChange);

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

export const useDarkMode = () => {
  return useContext(DarkModeContext);
};
