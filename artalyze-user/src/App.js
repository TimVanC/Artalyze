import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { DarkModeProvider, useDarkMode } from "./hooks/useDarkMode";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PrivateRoute from "./routes/PrivateRoute";
import { AuthProvider } from "./AuthContext";
import { Analytics } from "@vercel/analytics/react";

// Import Font Awesome and our custom styles
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./App.css";

function AppContent() {
  const { darkMode } = useDarkMode();

  // Toggle dark mode class on the body element
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  return (
    <Router>
      <div className={`app-container ${darkMode ? "dark-mode" : ""}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<Game />} />
          <Route path="/stats" element={<PrivateRoute component={Stats} />} />
          <Route path="/settings" element={<PrivateRoute component={Settings} />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <AppContent />
        <Analytics />
      </DarkModeProvider>
    </AuthProvider>
  );
}

export default App;
