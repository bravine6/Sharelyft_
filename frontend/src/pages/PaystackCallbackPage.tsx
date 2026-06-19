import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '@/config';

type Status = 'verifying' | 'success' | 'failed';

export default function PaystackCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('Verifying your payment…');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      setStatus('failed');
      setMessage('Missing payment reference. Please try again.');
      setTimeout(() => navigate('/dashboard'), 3000);
      return;
    }

    const verify = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/paystack/verify/${encodeURIComponent(reference)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Verification failed');
        }

        if (data.paid) {
          setStatus('success');
          setMessage(`Payment of KES ${data.amount_kes} confirmed!`);
          setTimeout(() => navigate('/my-rides'), 2500);
        } else {
          setStatus('failed');
          setMessage(`Payment status: ${data.status}. Please try again.`);
          setTimeout(() => navigate('/dashboard'), 3500);
        }
      } catch (err: any) {
        setStatus('failed');
        setMessage(err.message || 'Could not verify payment');
        setTimeout(() => navigate('/dashboard'), 3500);
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Payment</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Payment Successful</h2>
            <p className="text-gray-500">{message}</p>
            <p className="text-sm text-gray-400 mt-4">Redirecting…</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Payment Issue</h2>
            <p className="text-gray-500">{message}</p>
            <p className="text-sm text-gray-400 mt-4">Redirecting…</p>
          </>
        )}
      </div>
    </div>
  );
}
