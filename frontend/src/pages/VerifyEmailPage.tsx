import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! You can now sign in to your account.');
          // Auto redirect to login after 3 seconds
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Email verification failed. The link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Failed to verify email. Please try again later.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

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
        </div>
      </header>

      {/* Verification Content */}
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900">Verifying Email</h1>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900">Email Verified!</h1>
              <p className="text-gray-600">{message}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                >
                  Continue to Sign In
                </Button>
                <p className="text-sm text-gray-500">
                  Redirecting automatically in 3 seconds...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
              <p className="text-gray-600">{message}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                >
                  Go to Sign In
                </Button>
                <p className="text-sm text-gray-500">
                  You can request a new verification email when you try to sign in.
                </p>
              </div>
            </div>
          )}
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