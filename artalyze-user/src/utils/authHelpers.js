export const validatePassword = (password) => {
    // Check password meets security requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;
  
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;
  };
  
  export const validateOtp = (otp) => {
    // Verify OTP is exactly 6 digits
    return /^\d{6}$/.test(otp);
  };
  
  export const sendOtp = async (email) => {
    // Request OTP code to be sent to user's email
    const response = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  
    if (!response.ok) {
      throw new Error('Failed to send OTP');
    }
  
    return await response.json();
  };
  
  export const verifyOtp = async (email, otp) => {
    // Verify OTP code entered by user
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
  
    if (!response.ok) {
      throw new Error('Failed to verify OTP');
    }
  
    return await response.json();
  };
  