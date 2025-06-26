import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Car, Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const { verifyEmail, resendEmailVerification } = useAuth();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      handleVerification();
    } else {
      setError('Invalid verification link. Please check your email for the correct link.');
    }
  }, [token]);

  const handleVerification = async () => {
    if (!token) return;
    
    try {
      setIsVerifying(true);
      setError('');
      await verifyEmail(token);
      setMessage('Email verified successfully! You can now log in to your account.');
      setIsVerified(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Email verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    const email = prompt('Please enter your email address to resend verification:');
    if (!email) return;
    
    try {
      setIsResending(true);
      setError('');
      await resendEmailVerification(email);
      setMessage('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
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

      {/* Verification Status */}
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isVerified ? 'bg-green-100' : error ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {isVerifying ? (
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              ) : isVerified ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : error ? (
                <XCircle className="w-8 h-8 text-red-600" />
              ) : (
                <Mail className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isVerifying ? 'Verifying Email...' : 
               isVerified ? 'Email Verified!' : 
               error ? 'Verification Failed' : 'Email Verification'}
            </h1>
            <p className="text-gray-600">
              {isVerifying ? 'Please wait while we verify your email address' :
               isVerified ? 'Your email has been verified successfully. Redirecting to login...' :
               error ? 'There was a problem verifying your email address' :
               'Verifying your email address...'}
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

          <div className="space-y-4">
            {error && (
              <>
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Need help? Contact support or try these steps:
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Check your spam/junk folder</li>
                    <li>• Make sure you clicked the most recent email</li>
                    <li>• Try requesting a new verification email</li>
                  </ul>
                </div>
              </>
            )}

            {isVerified && (
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
              >
                Continue to Login
              </Button>
            )}

            <div className="text-center">
              <Link to="/login" className="text-blue-600 hover:text-blue-500 text-sm">
                Back to Login
              </Link>
            </div>
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