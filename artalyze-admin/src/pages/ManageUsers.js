import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ManageUsers.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    isAdmin: false,
  });
  const [editUserId, setEditUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data);
    } catch (error) {
      setErrorMessage('Failed to fetch users.');
    }
  };
  

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState({ ...formState, [name]: value });
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUserId) {
        await axios.put(`/api/admin/users/${editUserId}`, formState, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
      } else {
        await axios.post('/api/admin/users', formState, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
      }
      setFormState({ firstName: '', lastName: '', email: '', password: '', isAdmin: false });
      setEditUserId(null);
      fetchUsers();
    } catch (error) {
      setErrorMessage('Failed to save user. Please try again.');
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      fetchUsers();
    } catch (error) {
      setErrorMessage('Failed to delete user. Please try again.');
    }
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setEditUserId(user._id);
    setFormState({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      isAdmin: user.role === 'admin',
    });
  };

  return (
    <div className="manage-users-container">
      <h1>Manage Users</h1>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <form onSubmit={handleFormSubmit}>
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formState.firstName}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formState.lastName}
          onChange={handleInputChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formState.email}
          onChange={handleInputChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formState.password}
          onChange={handleInputChange}
          required={!editUserId} // Password is required only for new users
        />
        <label>
          Admin Access:
          <input
            type="checkbox"
            name="isAdmin"
            checked={formState.isAdmin}
            onChange={() => setFormState({ ...formState, isAdmin: !formState.isAdmin })}
          />
        </label>
        <button type="submit">{editUserId ? 'Update User' : 'Add User'}</button>
      </form>
      <h2>All Users</h2>
      <table>
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Admin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td>{user.firstName}</td>
              <td>{user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.role === 'admin' ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleEditUser(user)}>Edit</button>
                <button onClick={() => handleDeleteUser(user._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageUsers;
