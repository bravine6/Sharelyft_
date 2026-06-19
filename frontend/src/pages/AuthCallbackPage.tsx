import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/config';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const hasHandled = useRef(false);

  useEffect(() => {
    if (hasHandled.current) return;
    hasHandled.current = true;

    const waitForSession = async () => {
      // Client auto-exchanges the code on init (detectSessionInUrl: true).
      // Poll briefly for the session to appear instead of double-calling exchange.
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return data.session;
        await new Promise((r) => setTimeout(r, 150));
      }
      return null;
    };

    const handleAuthCallback = async () => {
      try {
        const session = await waitForSession();

        if (!session?.user) {
          console.error('No user session found after OAuth callback');
          setError('No user session found. Please try signing in again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Send the Google user data to your backend to create/sync the user profile
        const response = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleUser: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
              picture: session.user.user_metadata?.avatar_url,
              provider: 'google'
            },
            accessToken: session.access_token
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Backend auth error:', errorData);
          setError('Failed to complete authentication. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        const { token, user } = await response.json();
        
        // Set user and token in localStorage (the context will pick it up)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Navigate to dashboard
        navigate('/dashboard');
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Authentication Error</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <p className="text-sm text-gray-400">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Completing sign in...</h2>
        <p className="text-gray-500 mt-2">Please wait while we set up your account.</p>
      </div>
    </div>
  );
}