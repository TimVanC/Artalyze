import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Login from './pages/Login';
import PrivateRoute from './routes/PrivateRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} /> {/* Home page always accessible */}
      <Route path="/game" element={<Game />} /> {/* Game page always accessible */}
      <Route path="/login" element={<Login />} />
      {/* Protected Routes */}
      <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    </Routes>
  );
}

export default App;
