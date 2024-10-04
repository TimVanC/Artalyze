import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Stats from './pages/Stats'; // Import the Stats component
import Settings from './pages/Settings'; // Import the Settings component

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/stats" element={<Stats />} /> {/* Add Stats route */}
        <Route path="/settings" element={<Settings />} /> {/* Add Settings route */}
        {/* You can add more routes here if needed */}
      </Routes>
    </Router>
  );
}

export default App;
