import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import ManageDay from './components/ManageDay';
import ManageImages from './pages/ManageImages'; // New role as a dashboard

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/manage" element={<ManageImages />} />
        <Route path="/manage-day" element={<ManageDay />} />
      </Routes>
    </Router>
  );
}

export default App;
