import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { X, CreditCard, Check, AlertCircle, Clock } from 'lucide-react';

interface RideData {
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  vehicle_id: string;
  description?: string;
  origin_county: string;
  origin_town: string;
  destination_county: string;
  destination_town: string;
}

interface RidePostingPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  rideData: RideData;
  onPaymentSuccess: (rideId: string) => void;
}

const SERVICE_FEE = 50;

export default function RidePostingPayment({ isOpen, onClose, rideData, onPaymentSuccess }: RidePostingPaymentProps) {
  const { token } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'review' | 'processing' | 'success'>('review');

  const handlePaystackPayment = async () => {
    setIsProcessing(true);
    setError('');
    setStep('processing');

    try {
      // 1. Create the ride first so we have a ride_id for the payment record
      const rideResponse = await fetch(`${API_URL}/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...rideData, status: 'active' }),
      });

      if (!rideResponse.ok) {
        let msg = 'Failed to create ride';
        try {
          const err = await rideResponse.json();
          msg = err.message || msg;
        } catch { /* response wasn't JSON */ }
        throw new Error(msg);
      }

      const ride = await rideResponse.json();

      // 2. Initiate Paystack transaction
      const initResponse = await fetch(`${API_URL}/paystack/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purpose: 'ride_posting',
          amount: SERVICE_FEE,
          ride_id: ride?.id,
        }),
      });

      const initData = await initResponse.json();
      if (!initResponse.ok || !initData.authorization_url) {
        throw new Error(initData.message || 'Failed to initiate Paystack payment');
      }

      // 3. Redirect to Paystack hosted checkout
      window.location.href = initData.authorization_url;
    } catch (err: any) {
      console.error('Paystack flow error:', err);
      setError(err.message || 'Payment initiation failed');
      setStep('review');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {step === 'review' && (
          <>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Complete Ride Posting</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Ride Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Ride Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Route:</span>
                    <span className="font-medium">{rideData.origin} → {rideData.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium">
                      {new Date(rideData.departure_time).toLocaleDateString()} at{' '}
                      {new Date(rideData.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Seats Available:</span>
                    <span className="font-medium">{rideData.available_seats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per Seat:</span>
                    <span className="font-medium">KES {rideData.price_per_seat}</span>
                  </div>
                </div>
              </div>

              {/* Service Fee */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-blue-900">Service Fee</span>
                    <p className="text-sm text-blue-700 mt-1">One-time fee to post your ride</p>
                  </div>
                  <span className="font-bold text-blue-900 text-lg">KES {SERVICE_FEE}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Payments are processed securely by Paystack. You can pay by card or M-Pesa
                from Paystack's checkout.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 space-y-3">
              <Button
                onClick={handlePaystackPayment}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay KES {SERVICE_FEE} via Paystack
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Redirecting to Paystack…</h3>
            <p className="text-gray-600">Hold on while we open the secure checkout.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">Your ride has been posted successfully</p>
            <Button onClick={() => onPaymentSuccess('ride_posted')} className="bg-green-600 hover:bg-green-700 w-full">
              View My Rides
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
