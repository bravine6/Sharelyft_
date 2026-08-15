import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface PhoneVerificationProps {
  user: any;
}

type Step = 'send' | 'enter_code' | 'verifying';

export default function PhoneVerification({ user }: PhoneVerificationProps) {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>('send');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Don't render if no phone or already verified
  if (!user?.phone || user?.phone_verified) return null;

  const sendCode = async () => {
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/resend-phone-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send code');
      setSuccess(`Code sent to ${user.phone}. Check your messages.`);
      setStep('enter_code');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setError('Enter the 6-digit code from your SMS');
      return;
    }
    setVerifying(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/verify-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setSuccess('Phone verified!');
      // Pull fresh user state so the panel disappears + Verification card updates
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Phone className="w-6 h-6 text-amber-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-amber-900">Verify Your Phone</h3>
            <p className="text-sm text-amber-800">
              Your phone <span className="font-medium">{user.phone}</span> isn't verified yet.
              Verify it to unlock all features.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && step === 'enter_code' && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-md flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {step === 'send' && (
          <Button
            onClick={sendCode}
            disabled={sending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {sending ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              'Send verification code'
            )}
          </Button>
        )}

        {step === 'enter_code' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">
                Enter the 6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full max-w-xs px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg tracking-widest font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={verifyCode}
                disabled={verifying || code.length !== 6}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {verifying ? 'Verifying…' : 'Verify code'}
              </Button>
              <Button
                onClick={sendCode}
                disabled={sending}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {sending ? 'Sending…' : 'Resend code'}
              </Button>
            </div>
            <p className="text-xs text-amber-700">
              Didn't get the SMS? Wait a minute, then try Resend.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
