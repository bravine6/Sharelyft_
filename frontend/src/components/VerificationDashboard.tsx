import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Mail, 
  Smartphone, 
  ShieldCheck,
  Shield,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function VerificationDashboard() {
  const { user, resendEmailVerification, resendPhoneVerification } = useAuth();
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isResendingPhone, setIsResendingPhone] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [phoneMessage, setPhoneMessage] = useState('');

  if (!user) return null;

  const isEmailVerified = user.email_verified;
  const isPhoneVerified = user.phone_verified;
  const isFullyVerified = isEmailVerified && isPhoneVerified;

  const handleResendEmail = async () => {
    try {
      setIsResendingEmail(true);
      setEmailMessage('');
      await resendEmailVerification(user.email);
      setEmailMessage('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      setEmailMessage(error.message || 'Failed to send verification email');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleResendPhone = async () => {
    try {
      setIsResendingPhone(true);
      setPhoneMessage('');
      await resendPhoneVerification(user.phone);
      setPhoneMessage('Verification code sent! Please check your messages.');
    } catch (error: any) {
      setPhoneMessage(error.message || 'Failed to send verification code');
    } finally {
      setIsResendingPhone(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <Card className={`${isFullyVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${isFullyVerified ? 'bg-green-100' : 'bg-amber-100'}`}>
              {isFullyVerified ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-semibold ${isFullyVerified ? 'text-green-800' : 'text-amber-800'}`}>
                {isFullyVerified ? 'Account Fully Verified' : 'Account Verification Required'}
              </h2>
              <p className={`text-sm ${isFullyVerified ? 'text-green-700' : 'text-amber-700'}`}>
                {isFullyVerified 
                  ? 'Your account is fully verified and ready to use all ShareLyft features.'
                  : 'Complete verification to access all ShareLyft features and ensure account security.'
                }
              </p>
            </div>
            {isFullyVerified && (
              <div className="text-right">
                <div className="flex items-center text-green-600 mb-1">
                  <Shield className="w-5 h-5 mr-2" />
                  <span className="font-medium">Verified Account</span>
                </div>
                <p className="text-xs text-green-600">All security checks passed</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Verification Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Verification */}
        <Card className="relative">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full ${
                isEmailVerified ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Mail className={`w-6 h-6 ${
                  isEmailVerified ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-900">Email Verification</h3>
                  {isEmailVerified ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{user.email}</p>
                
                <div className={`text-sm font-medium mb-3 ${
                  isEmailVerified ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isEmailVerified ? '✓ Verified' : '✗ Not Verified'}
                </div>

                {emailMessage && (
                  <div className={`text-xs p-2 rounded mb-3 ${
                    emailMessage.includes('sent') || emailMessage.includes('sent!') 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {emailMessage}
                  </div>
                )}

                {!isEmailVerified && (
                  <div className="space-y-2">
                    <Link to="/verify-email">
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Verify Email
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={handleResendEmail}
                      disabled={isResendingEmail}
                    >
                      {isResendingEmail ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend Email'
                      )}
                    </Button>
                  </div>
                )}

                {isEmailVerified && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center text-green-700 text-sm">
                      <Clock className="w-4 h-4 mr-2" />
                      Verified on signup
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phone Verification */}
        <Card className="relative">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full ${
                isPhoneVerified ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Smartphone className={`w-6 h-6 ${
                  isPhoneVerified ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-900">Phone Verification</h3>
                  {isPhoneVerified ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{user.phone}</p>
                
                <div className={`text-sm font-medium mb-3 ${
                  isPhoneVerified ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPhoneVerified ? '✓ Verified' : '✗ Not Verified'}
                </div>

                {phoneMessage && (
                  <div className={`text-xs p-2 rounded mb-3 ${
                    phoneMessage.includes('sent') || phoneMessage.includes('sent!') 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {phoneMessage}
                  </div>
                )}

                {!isPhoneVerified && (
                  <div className="space-y-2">
                    <Link to="/verify-phone" state={{ phone: user.phone }}>
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                        Verify Phone
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={handleResendPhone}
                      disabled={isResendingPhone}
                    >
                      {isResendingPhone ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend Code'
                      )}
                    </Button>
                  </div>
                )}

                {isPhoneVerified && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center text-green-700 text-sm">
                      <Clock className="w-4 h-4 mr-2" />
                      Verified on signup
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Verification Options */}
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="p-6">
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Enhanced Verification</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add extra security to your account with ID verification
            </p>
            <Button variant="outline" disabled>
              <ShieldCheck className="w-4 h-4 mr-2" />
              ID Verification (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      {!isFullyVerified && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Benefits of Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Book and Offer Rides</p>
                  <p className="text-sm text-blue-700">Access all ride sharing features</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Secure Payments</p>
                  <p className="text-sm text-blue-700">Make and receive payments safely</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Build Trust</p>
                  <p className="text-sm text-blue-700">Verified badge increases trust</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Account Security</p>
                  <p className="text-sm text-blue-700">Protect your account from fraud</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}