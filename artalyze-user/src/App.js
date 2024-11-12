import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Login from './pages/Login';
import PrivateRoute from './routes/PrivateRoute';
import { AuthProvider } from './AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<Game />} /> {/* Make sure Game is NOT wrapped in PrivateRoute */}
          <Route path="/stats" element={<PrivateRoute component={Stats} />} />
          <Route path="/settings" element={<PrivateRoute component={Settings} />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
