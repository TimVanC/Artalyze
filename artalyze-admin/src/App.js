import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ManageDay from './components/ManageDay';
import UserManagement from './pages/ManageUsers';
import AdminOverview from './components/AdminOverview';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const isLoggedIn = localStorage.getItem('adminToken');

  return (
    <Router>
      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to="/overview" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
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
