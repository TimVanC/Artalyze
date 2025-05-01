import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ManageDay from './components/ManageDay';
import UserManagement from './pages/ManageUsers';
import AdminOverview from './components/AdminOverview';

// Protected route component that checks for admin authentication
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const isLoggedIn = localStorage.getItem('adminToken');

  return (
    <Router>
      <Routes>
        {/* Redirect to overview if logged in, otherwise to login page */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/overview" /> : <Navigate to="/login" />} />
        {/* Admin login page */}
        <Route path="/login" element={<Login />} />
        {/* Protected routes requiring admin authentication */}
        <Route
          path="/overview"
          element={
            <ProtectedRoute>
              <AdminOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-day"
          element={
            <ProtectedRoute>
              <ManageDay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
