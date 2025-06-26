import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Car, Smartphone, CheckCircle, RefreshCw } from 'lucide-react';

export default function VerifyPhonePage() {
  const location = useLocation();
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const { verifyPhone, resendPhoneVerification } = useAuth();
  const navigate = useNavigate();
  
  // Get phone number from location state (passed from registration)
  const phoneNumber = location.state?.phone || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!verificationCode) {
      setError('Verification code is required');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    if (!phoneNumber) {
      setError('Phone number not found. Please register again.');
      return;
    }
    
    try {
      setIsVerifying(true);
      await verifyPhone(phoneNumber, verificationCode);
      setMessage('Phone number verified successfully!');
      setIsVerified(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Phone verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!phoneNumber) {
      setError('Phone number not found. Please register again.');
      return;
    }
    
    try {
      setIsResending(true);
      setError('');
      await resendPhoneVerification(phoneNumber);
      setMessage('Verification code sent! Please check your messages.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+254')) {
      return phone.replace('+254', '+254 ');
    }
    return phone;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ShareLyft</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link to="/login" className="text-gray-600 hover:text-gray-900">
              Back to Login
            </Link>
          </div>
        </div>
      </header>

      {/* Verification Form */}
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isVerified ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {isVerified ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Smartphone className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isVerified ? 'Phone Verified!' : 'Verify Phone Number'}
            </h1>
            <p className="text-gray-600">
              {isVerified 
                ? 'Your phone number has been verified successfully'
                : `We've sent a 6-digit code to ${formatPhoneNumber(phoneNumber)}`
              }
            </p>
          </div>

          {message && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {!isVerified ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only digits
                    if (value.length <= 6) {
                      setVerificationCode(value);
                    }
                  }}
                  className="w-full px-3 py-2 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <div className="text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to your phone
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                disabled={isVerifying || verificationCode.length !== 6}
              >
                {isVerifying ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Phone Number'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
              >
                Continue to Login
              </Button>
            </div>
          )}

          {!isVerified && (
            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-gray-600">
                Didn't receive the code?
              </p>
              <Button
                onClick={handleResendCode}
                disabled={isResending}
                variant="outline"
                className="w-full"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/register" className="text-blue-600 hover:text-blue-500 text-sm">
              Wrong phone number? Register again
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-4 border-t">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; 2024 ShareLyft. All rights reserved.
        </div>
      </footer>
    </div>
  );
}