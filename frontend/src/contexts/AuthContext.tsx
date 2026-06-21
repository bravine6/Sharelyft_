import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '@/config';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  first_name: string;
  national_id: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  user_type: 'driver' | 'passenger';
  email_verified: boolean;
  phone_verified: boolean;
  profile_photo?: string;
  driver_license_verified?: boolean;
  vehicle_insurance_verified?: boolean;
  admin_permissions?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  verifyPhone: (phone: string, code: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<void>;
  resendPhoneVerification: (phone: string) => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  user_type?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token and user data on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        logout();
      }
    } else if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch user data when token changes
  const fetchUser = async (currentToken: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Fetched user profile data:', userData);
        setUser(userData);
      } else {
        // Token invalid
        logout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      console.log('Login response data:', data);
      console.log('User data from login:', data.user);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    // We use skipBrowserRedirect + explicit window.location.href to avoid the
    // first-click-does-nothing bug. Letting the SDK auto-redirect during PKCE
    // setup is racy — the implicit redirect can fire before the code_verifier
    // has been persisted to storage, or not fire at all. Doing the navigation
    // ourselves with the URL the SDK returns is deterministic.
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.url) {
        throw new Error('Google sign-in failed: no redirect URL returned.');
      }

      // Navigate manually. Leave isLoading=true since the page is going away.
      window.location.href = data.url;
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      // Registration successful - email and phone verification required
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!token) throw new Error('Not authenticated');

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Profile update failed');
      }

      const result = await response.json();
      const updatedUser = result.user || result;
      const newUserData = user ? { ...user, ...updatedUser } : null;
      setUser(newUserData);
      
      // Also update localStorage to persist changes
      if (newUserData) {
        localStorage.setItem('user', JSON.stringify(newUserData));
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) {
      throw new Error('No authentication token available');
    }
    await fetchUser(token);
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reset email');
      }

      return await response.json();
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }

      return await response.json();
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Email verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const verifyPhone = async (phone: string, code: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, code })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Phone verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Phone verification error:', error);
      throw error;
    }
  };

  const resendEmailVerification = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/resend-email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend verification email');
      }

      return await response.json();
    } catch (error) {
      console.error('Resend email verification error:', error);
      throw error;
    }
  };

  const resendPhoneVerification = async (phone: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/resend-phone-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend verification code');
      }

      return await response.json();
    } catch (error) {
      console.error('Resend phone verification error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    refreshUser,
    forgotPassword,
    resetPassword,
    verifyEmail,
    verifyPhone,
    resendEmailVerification,
    resendPhoneVerification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}