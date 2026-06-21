import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { Car, CheckCircle, XCircle, Loader, Mail } from 'lucide-react';

type Status = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  // IMPORTANT: We do NOT auto-POST on mount. Email security scanners
  // (Gmail/Outlook Safe Links, Mimecast, corporate AVs) render the URL in a
  // headless browser before the user clicks, which would silently consume the
  // single-use token. Requiring a user click means real humans verify, scanners
  // don't. Combined with idempotent backend handling, double-clicks/refreshes
  // are also safe.

  const handleVerify = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. The token is missing — please use the link from your email.');
      return;
    }

    setStatus('verifying');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully! You can now sign in to your account.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus('error');
        if (data.error === 'TOKEN_EXPIRED') {
          setMessage('This verification link has expired. Please sign in and click "Resend email" from the banner.');
        } else {
          setMessage(data.message || 'Email verification failed.');
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
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
        </div>
      </header>

      <div className="flex-1 flex justify-center items-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
          {status === 'idle' && (
            <div className="space-y-4">
              <Mail className="w-16 h-16 text-green-600 mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900">Confirm Your Email</h1>
              <p className="text-gray-600">
                Click the button below to verify your email address and activate your account.
              </p>
              {!token && (
                <p className="text-sm text-red-600">
                  No verification token found in the URL. Please make sure you used the link from your email.
                </p>
              )}
              <Button
                onClick={handleVerify}
                disabled={!token}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
              >
                Verify Email
              </Button>
              <p className="text-xs text-gray-400">
                Why a button? Email security scanners may follow the link automatically.
                Requiring a click ensures your verification isn't consumed before you arrive.
              </p>
            </div>
          )}

          {status === 'verifying' && (
            <div className="space-y-4">
              <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto" />
              <h1 className="text-2xl font-bold text-gray-900">Verifying…</h1>
              <p className="text-gray-600">Please wait a moment.</p>
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
                <p className="text-sm text-gray-500">Redirecting automatically in 3 seconds…</p>
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
                  onClick={handleVerify}
                  variant="outline"
                  className="w-full"
                  disabled={!token}
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                >
                  Go to Sign In
                </Button>
                <p className="text-sm text-gray-500">
                  Once signed in, use the banner at the top to resend the verification email if needed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="bg-white py-4 border-t">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; 2026 ShareLyft. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
