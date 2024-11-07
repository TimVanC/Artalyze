import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
// import Register from './pages/Register';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/stats" element={<Stats />} /> {/* Add Stats route */}
        <Route path="/settings" element={<Settings />} /> {/* Add Settings route */}
        {/* <Route path="/register" element={<Register />} /> */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
