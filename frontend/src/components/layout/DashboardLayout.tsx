import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';
import {
  Car,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Search,
  PlusCircle,
  Clock,
  MessageSquare,
  Settings,
  FileText,
  Shield,
  CreditCard,
  Mail,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    try {
      setResending(true);
      setResendMessage(null);
      const response = await fetch(`${API_URL}/auth/resend-email-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await response.json();
      if (response.ok) {
        setResendMessage({ type: 'success', text: 'Verification email sent. Check your inbox (and spam).' });
      } else {
        setResendMessage({ type: 'error', text: data.message || 'Failed to resend verification email.' });
      }
    } catch (err: any) {
      setResendMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setResending(false);
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={20} /> },
    { name: 'Find Rides', path: '/find-rides', icon: <Search size={20} /> },
    ...(user?.user_type === 'driver' ? [{ name: 'Offer Ride', path: '/offer-ride', icon: <PlusCircle size={20} /> }] : []),
    { name: 'My Rides', path: '/my-rides', icon: <Clock size={20} /> },
    ...(user?.user_type === 'driver' ? [{ name: 'Ride Requests', path: '/ride-requests', icon: <FileText size={20} /> }] : []),
    ...(user?.user_type === 'passenger' ? [{ name: 'My Requests', path: '/my-ride-requests', icon: <FileText size={20} /> }] : []),
    ...(user?.user_type === 'driver' ? [{ name: 'My Vehicles', path: '/vehicles', icon: <Car size={20} /> }] : []),
    { name: 'Messages', path: '/messages', icon: <MessageSquare size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
    { name: 'Payment Methods', path: '/payment-methods', icon: <CreditCard size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    // Admin section
    ...((user as any)?.admin_permissions ? [{ name: 'Admin Dashboard', path: '/admin', icon: <Shield size={20} /> }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ShareLyft</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user?.first_name}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:w-64 border-r bg-white">
          <div className="w-full p-4">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-3 p-3 rounded-md transition-colors ${
                    isActive(link.path)
                      ? 'bg-green-50 text-green-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.icon}
                  <span>{link.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-black bg-opacity-50">
            <div className="w-64 h-full bg-white">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user?.first_name}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X size={24} />
                  </button>
                </div>
              </div>
              <nav className="p-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-3 p-3 rounded-md transition-colors ${
                      isActive(link.path)
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </Link>
                ))}
                <button 
                  className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-md w-full"
                  onClick={handleLogout}
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {user && !user.email_verified && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Verify your email</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Your email <span className="font-medium">{user.email}</span> isn't verified yet.
                    Some features may be limited. Check your inbox or resend the link below.
                  </p>
                  {resendMessage && (
                    <p className={`text-sm mt-2 ${resendMessage.type === 'success' ? 'text-green-700' : 'text-red-700'} flex items-center gap-1`}>
                      {resendMessage.type === 'success' && <CheckCircle className="w-4 h-4" />}
                      {resendMessage.text}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleResendVerification}
                  disabled={resending || resendMessage?.type === 'success'}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {resending ? 'Sending…' : 'Resend email'}
                </Button>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}