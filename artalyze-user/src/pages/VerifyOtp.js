import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOtp } from '../utils/authHelpers';
import { useAuth } from '../AuthContext'; // Import the updated AuthContext

const VerifyOtp = () => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { email } = useAuth(); // Retrieve email from AuthContext

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await verifyOtp(email, otp);
            navigate('/reset-password', { state: { email } }); // Navigate with email
        } catch (error) {
            console.error('Error verifying OTP:', error);
            setError('Invalid or expired OTP. Please try again.');
        }
    };

    return (
        <form onSubmit={handleOtpSubmit}>
            <h2>Verify OTP</h2>
            <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit">Verify</button>
        </form>
    );
};

export default VerifyOtp;
