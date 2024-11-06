import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError(''); // Clear error message

    if (email === '') {
      setError('Please enter an email');
      return;
    }

    // Mock check for existing email (replace with actual API call)
    const emailExists = true; // Replace with actual logic
    if (emailExists) {
      setIsRegistering(false);
    } else {
      setIsRegistering(true);
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    // Handle registration (add your backend call here)
    console.log('Registering user with email:', email, 'and password:', password);
    navigate('/game'); // Redirect after registration
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    // Handle login (add your backend call here)
    console.log('Logging in user with email:', email, 'and password:', password);
    navigate('/game'); // Redirect after login
  };

  return (
    <div className="login-container">
      <h2>{isRegistering ? 'Sign Up' : 'Log In'}</h2>
      <form onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {isRegistering && (
          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        {!isRegistering && (
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        {error && <p className="error-message">{error}</p>}
        <button type="submit">{isRegistering ? 'Sign Up' : 'Log In'}</button>
      </form>
      <button className="back-button" onClick={() => navigate('/')}>Back to Home</button>
    </div>
  );
};

export default Login;
