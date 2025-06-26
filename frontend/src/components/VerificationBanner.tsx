import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function VerificationBanner() {
  const { user } = useAuth();

  if (!user) return null;

  const isEmailVerified = user.email_verified;
  const isPhoneVerified = user.phone_verified;
  const isFullyVerified = isEmailVerified && isPhoneVerified;

  // Don't show banner if both are verified
  if (isFullyVerified) return null;

  return (
    <Card className="bg-amber-50 border-amber-200 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 mb-2">
              Complete Your Account Verification
            </h3>
            <p className="text-sm text-amber-700 mb-4">
              To access all ShareLyft features and ensure account security, please verify your contact information.
            </p>
            
            {/* Verification Status */}
            <div className="space-y-3 mb-4">
              {/* Email Verification */}
              <div className="flex items-center justify-between bg-white rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Email Verification</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isEmailVerified ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium text-red-700">Pending</span>
                    </>
                  )}
                </div>
              </div>

              {/* Phone Verification */}
              <div className="flex items-center justify-between bg-white rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Phone Verification</p>
                    <p className="text-sm text-gray-600">{user.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isPhoneVerified ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium text-red-700">Pending</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {!isEmailVerified && (
                <Link to="/verify-email">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Mail className="w-4 h-4 mr-2" />
                    Verify Email
                  </Button>
                </Link>
              )}
              
              {!isPhoneVerified && (
                <Link to="/verify-phone" state={{ phone: user.phone }}>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Verify Phone
                  </Button>
                </Link>
              )}
            </div>

            {/* Restrictions Notice */}
            <div className="mt-4 p-3 bg-amber-100 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Limited Access:</strong> Until verification is complete, you can browse rides but cannot book or offer rides. 
                Some features may be restricted for your security.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}