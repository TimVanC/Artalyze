import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Email check, 2: OTP, 3: Registration form, 4: Password login, 5: Forgot password
  const [resendMessage, setResendMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false); // State for forgot password flow

  // Step 1: Handle email submission to check if it exists
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (email === '') {
      setError('Please enter an email');
      return;
    }

    try {
      console.log("Submitting email for check:", email);
      const response = await axiosInstance.post('/auth/email-check', { email });

      if (response.data.requiresPassword) {
        console.log("Email exists, proceeding to password entry.");
        setStep(4); // Existing user login step
      } else {
        console.log("Email not found, sending OTP to:", email);
        await axiosInstance.post('/auth/request-otp', { email });
        setStep(2); // New user OTP step
      }
    } catch (error) {
      console.error('Email check error:', error);
      setError('An error occurred during email check. Please try again.');
    }
  };

  // Step 2: Handle OTP verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log("Verifying OTP for email:", email, "OTP:", otp);
      await axiosInstance.post('/auth/verify-otp', { email, otp });
      console.log("OTP verified successfully for:", email);
      setStep(3); // New user registration form step
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Invalid or expired OTP. Please try again.');
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    setError('');
    try {
      console.log("Requesting to resend OTP for email:", email);
      const response = await axiosInstance.post('/auth/resend-otp', { email });
      console.log("Resent OTP successfully to:", email);
      setResendMessage(response.data.message);
    } catch (error) {
      console.error('Resend OTP error:', error);
      setResendMessage('Failed to resend OTP. Please try again.');
    }
  };

  // Step 3: Handle new user registration
  const handleLoginOrRegisterSubmit = async (e) => {
    e.preventDefault();
    const endpoint = step === 3 && otp ? '/auth/register' : '/auth/login';

    try {
      console.log("Submitting registration/login data for:", email);
      const response = await axiosInstance.post(endpoint, { email, password, firstName, lastName });
      localStorage.setItem('authToken', response.data.token);
      navigate('/game');
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication failed. Please check your credentials.');
    }
  };

  // Step 4: Handle login for existing users
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log("Attempting to log in with email:", email);
      const response = await axiosInstance.post('/auth/login', { email, password });
      localStorage.setItem('authToken', response.data.token);
      navigate('/game'); // Redirect to the game screen
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your credentials.');
    }
  };

  // Step 5: Handle forgot password flow
  const handleForgotPassword = async () => {
    setError('');
    try {
      console.log("Submitting forgot password request for:", email);
      const response = await axiosInstance.post('/auth/forgot-password', { email });
      setForgotPassword(true);
      setStep(2); // Reuse OTP step
    } catch (error) {
      console.error('Forgot Password Error:', error);
      setError('Unable to send reset code. Please try again.');
    }
  };

  // Handle OTP verification for password reset
  const handleOtpSubmitForReset = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log("Verifying OTP for password reset, email:", email);
      await axiosInstance.post('/auth/verify-reset-otp', { email, otp });
      setStep(5); // Proceed to reset password
    } catch (error) {
      console.error('OTP verification error for reset:', error);
      setError('Invalid or expired OTP. Please try again.');
    }
  };

  // Handle password reset submission
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log("Submitting new password for:", email);
      await axiosInstance.post('/auth/reset-password', { email, newPassword });
      setForgotPassword(false);
      setStep(4); // Back to login
    } catch (error) {
      console.error('Reset Password Error:', error);
      setError('Failed to reset password. Please try again.');
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
          <button type="button" onClick={handleForgotPassword}>Forgot Password?</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={forgotPassword ? handleOtpSubmitForReset : handleOtpSubmit}>
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
          <button type="button" onClick={handleResendOtp}>Resend OTP</button>
          {resendMessage && <p className="resend-message">{resendMessage}</p>}
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleLoginOrRegisterSubmit}>
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

      {step === 5 && (
        <form onSubmit={handleResetPasswordSubmit}>
          <h2>Reset Your Password</h2>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Reset Password</button>
        </form>
      )}
    </div>
  );
};

export default Login;
