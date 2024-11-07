import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Email check, 2: OTP, 3: Registration form, 4: Password login

  // Step 1: Handle email submission to check if it exists
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (email === '') {
      setError('Please enter an email');
      return;
    }

    try {
      const response = await axios.post('/api/auth/email-check', { email });
      if (response.data.requiresPassword) {
        setStep(4); // Existing user login step
      } else {
        await axios.post('/api/auth/request-otp', { email });
        setStep(2); // New user OTP step
      }
    } catch (error) {
      console.error('Email check error:', error);
      setError('An error occurred. Please try again.');
    }
  };

  // Step 2: Handle OTP verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/verify-otp', { email, otp });
      setStep(3); // New user registration form step
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Invalid or expired OTP. Please try again.');
    }
  };

  // Step 3: Handle new user registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth/register', {
        firstName,
        lastName,
        email,
        password,
      });
      console.log('Registered successfully:', response.data);
      navigate('/game');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    }
  };

  // Step 4: Handle login for existing users
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('Logged in successfully:', response.data);
      navigate('/game');
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="login-container">
      {step === 1 && (
        <form onSubmit={handleEmailSubmit}>
          <h2>Enter Your Email</h2>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Next</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpSubmit}>
          <h2>Enter OTP</h2>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Verify OTP</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleRegisterSubmit}>
          <h2>Create Your Account</h2>
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} readOnly disabled />
          <input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Sign Up</button>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleLoginSubmit}>
          <h2>Log In</h2>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Log In</button>
        </form>
      )}
    </div>
  );
};

export default Login;
