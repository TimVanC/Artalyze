import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ManageDay from './components/ManageDay';
import Upload from './components/Upload';
import UserManagement from './pages/ManageUsers';
import AdminOverview from './components/AdminOverview';

// Protect routes that require admin authentication
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
        
        {/* Admin dashboard overview */}
        <Route
          path="/overview"
          element={
            <ProtectedRoute>
              <AdminOverview />
            </ProtectedRoute>
          }
        />
        
        {/* Upload human images for automated pairing */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        
        {/* Manage and view daily puzzle image pairs */}
        <Route
          path="/manage-day"
          element={
            <ProtectedRoute>
              <ManageDay />
            </ProtectedRoute>
          }
        />
        
        {/* Manage user accounts and statistics */}
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
