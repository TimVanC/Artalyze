import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosInstance';
import logo from '../assets/images/artalyze-logo.png';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Added confirmPassword
  const [showPassword, setShowPassword] = useState(false); // Added showPassword state
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Added showConfirmPassword state
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [resendMessage, setResendMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [subheadingText, setSubheadingText] = useState('Log in or create an account');
  const [showLoginSubheading, setShowLoginSubheading] = useState(false); // To toggle between the subheadings




  // Validate email format
  const isEmailValid = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle Email Input Change
  const handleEmailChange = (e) => {
    const input = e.target.value;
    setEmail(input);

    // Validate email
    if (!isEmailValid(input)) {
      setError('Please enter a valid email address.');
    } else {
      setError(''); // Clear error if email is valid
    }
  };

  // Handle Email Submission and Dynamic Password Reveal
  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    if (!isEmailValid(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    try {
      console.log('Sending email-check request:', email);
      const response = await axiosInstance.post('/auth/email-check', { email });

      if (response.data.requiresPassword) {
        console.log('Email exists, showing password field');
        setStep(4); // Transition to password step for existing users
        setIsPasswordVisible(true); // Show password field under the email
      } else {
        console.log('Email not found, sending OTP');
        await axiosInstance.post('/auth/request-otp', { email });
        setStep(2); // Transition to OTP step for new users
      }
    } catch (error) {
      console.error('Error during email check:', error.response?.data || error.message);
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

      // Store user info in localStorage
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('userId', user.userId); // Save the userId for later use
      localStorage.setItem('userFirstName', user.firstName);
      localStorage.setItem('userLastName', user.lastName);

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

      // Store user info in localStorage
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('userId', user.userId); // Save the userId for later use
      localStorage.setItem('userFirstName', user.firstName);
      localStorage.setItem('userLastName', user.lastName);

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

  const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;
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
      <div className="login-top-bar">
        <div className="login-app-title">Artalyze</div>
      </div>
      <div className="login-logo-container">
        <img src={logo} alt="Artalyze Logo" className="login-app-logo" />
      </div>
      {
        step === 1 && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();

              if (!isEmailValid(email)) {
                setError('Please enter a valid email address.');
                return;
              }

              setError('');
              try {
                console.log('Sending email-check request:', email);
                const response = await axiosInstance.post('/auth/email-check', { email });

                if (response.data.requiresPassword) {
                  console.log('Email exists, showing password field inline');
                  setIsPasswordVisible(true); // Show password field under email
                  setShowLoginSubheading(true); // Show "Log in" subheading
                } else {
                  console.log('Email not found, sending OTP');
                  await axiosInstance.post('/auth/request-otp', { email });
                  setStep(2); // Transition to OTP step for new users
                }
              } catch (error) {
                console.error('Error during email check:', error.response?.data || error.message);
                setError('An error occurred during email check. Please try again.');
              }
            }}
          >
            <h2>Welcome to Artalyze</h2>

            {/* Subheading Container */}
            <div className="subheading-container">
              <p
                className={`subheading ${showLoginSubheading ? 'hidden' : 'fade-in'}`}
                key="default-subheading"
              >
                Log in or create an account
              </p>
              <p
                className={`subheading ${showLoginSubheading ? 'fade-in' : 'hidden'}`}
                key="login-subheading"
              >
                Log in
              </p>
            </div>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (!isEmailValid(e.target.value)) {
                  setError('Please enter a valid email address.');
                } else {
                  setError('');
                }
              }}
              required
            />
            {error && <p className="error-message">{error}</p>}

            {isPasswordVisible && (
              <div className={`password-container fade-in`} key="password-container">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="forgot-password-button"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type={isPasswordVisible ? 'button' : 'submit'}
              className="next-button"
              style={{
                backgroundColor: isEmailValid(email) ? '#4d73af' : '#333',
                cursor: isEmailValid(email) ? 'pointer' : 'not-allowed',
              }}
              disabled={!isEmailValid(email)}
              onClick={isPasswordVisible ? handleLoginSubmit : undefined} // Login if password is visible
            >
              {isPasswordVisible ? 'Log In' : 'Next'}
            </button>

            <div className="terms-container">
              <p>
                By continuing, you agree to the{' '}
                <a href="/terms-of-service">Terms of Service</a> and{' '}
                <a href="/privacy-policy">Privacy Policy</a>.
              </p>
            </div>
          </form>



        )
      }

      {step === 2 && (
        <>
          <h2>Verify your email address</h2>
          <p className="subheading-otp">
            Enter the code we sent to <strong>{email}</strong> to complete your registration. This
            code expires in 10 minutes.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (otp.length === 6 && /^\d{6}$/.test(otp)) {
                handleOtpSubmit(e);
              } else {
                setError('OTP must be exactly 6 digits.');
              }
            }}
          >
            <input
              type="text"
              placeholder="Verification code"
              value={otp}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) {
                  setOtp(value);
                  setError('');
                } else {
                  setError('OTP must be numeric.');
                }
              }}
              required
            />
            {error && <p className="error-message">{error}</p>}
            <button
              type="submit"
              className="next-button"
              style={{
                backgroundColor: otp.length === 6 && /^\d{6}$/.test(otp) ? '#4d73af' : '#333',
                cursor: otp.length === 6 && /^\d{6}$/.test(otp) ? 'pointer' : 'not-allowed',
              }}
              disabled={otp.length !== 6 || !/^\d{6}$/.test(otp)}
            >
              Submit
            </button>
            <p className="terms-container">
              Didn’t receive a code? Check your spam folder or{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setError('');
                  handleResendOtp()
                    .then(() => {
                      setResendMessage('A new OTP has been sent to your email.');
                      setTimeout(() => setResendMessage(''), 5000);
                    })
                    .catch(() => {
                      setError('Failed to resend OTP. Please try again.');
                    });
                }}
              >
                request a new one
              </a>
              .
            </p>
            {resendMessage && <p className="success-message">{resendMessage}</p>}
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <h2>Create Your Account</h2>
          <p className="subheading-signup">Complete the form below to start your journey with Artalyze.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLoginOrRegisterSubmit(e);
            }}
          >
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              readOnly
              disabled
            />
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (!validatePassword(e.target.value)) {
                  setError(
                    'Password must be 8+ characters and include uppercase, lowercase, number, and special character.'
                  );
                } else {
                  setError('');
                }
              }}
              required
            />
            {password && !validatePassword(password) && (
              <p className="error-message">
                Password must be 8+ characters and include uppercase, lowercase, number, and special character.
              </p>
            )}
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (password !== e.target.value) {
                  setError('Passwords do not match.');
                } else {
                  setError('');
                }
              }}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="error-message">Passwords do not match.</p>
            )}
            <button
              type="submit"
              className="next-button"
              style={{
                backgroundColor:
                  firstName &&
                    lastName &&
                    email &&
                    validatePassword(password) &&
                    password === confirmPassword
                    ? '#4d73af'
                    : '#333',
                cursor:
                  firstName &&
                    lastName &&
                    email &&
                    validatePassword(password) &&
                    password === confirmPassword
                    ? 'pointer'
                    : 'not-allowed',
              }}
              disabled={
                !firstName ||
                !lastName ||
                !email ||
                !validatePassword(password) ||
                password !== confirmPassword
              }
            >
              Sign Up
            </button>
          </form>
        </>
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
          <button type="button" className="forgot-password-button" onClick={handleForgotPassword}>
            Forgot Password?
          </button>
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
      <footer className="footer">&copy; {new Date().getFullYear()} Artalyze</footer>
    </div>
  );




};

export default Login;
