import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface CancellationPolicy {
  can_cancel: boolean;
  refund_percentage: number;
  cancellation_fee: number;
  deadline: string | null;
}

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  type: 'ride' | 'request';
  onSuccess: () => void;
}

export default function CancelBookingModal({ 
  isOpen, 
  onClose, 
  requestId, 
  type,
  onSuccess 
}: CancelBookingModalProps) {
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [hoursUntilDeparture, setHoursUntilDeparture] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && type === 'request') {
      fetchCancellationPolicy();
    }
  }, [isOpen, requestId, type]);

  const fetchCancellationPolicy = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/rides/requests/${requestId}/cancellation-policy`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPolicy(data.data.policy);
        setHoursUntilDeparture(data.data.hours_until_departure);
      } else {
        throw new Error('Failed to fetch cancellation policy');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const endpoint = type === 'ride' 
        ? `/api/rides/${requestId}/cancel`
        : `/api/rides/requests/${requestId}/cancel`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`${type === 'ride' ? 'Ride' : 'Booking'} cancelled successfully!`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Cancel {type === 'ride' ? 'Ride' : 'Booking'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 p-3 rounded-md flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-md flex items-center">
              <XCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
              <span className="ml-2 text-gray-600">Loading cancellation policy...</span>
            </div>
          )}

          {!isLoading && type === 'request' && policy && (
            <div className="space-y-4">
              {/* Cancellation Policy Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Cancellation Policy
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Time until departure:</span>
                    <span className="font-medium">
                      {hoursUntilDeparture > 0 
                        ? `${Math.round(hoursUntilDeparture)} hours`
                        : 'Departure time passed'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Refund percentage:</span>
                    <span className="font-medium text-green-600">
                      {policy.refund_percentage}%
                    </span>
                  </div>
                  
                  {policy.cancellation_fee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Cancellation fee:</span>
                      <span className="font-medium text-red-600">
                        KES {policy.cancellation_fee}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning Messages */}
              {!policy.can_cancel && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-red-800">Cannot Cancel</h5>
                      <p className="text-sm text-red-700">
                        Cancellation is not allowed within 2 hours of departure time.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {policy.can_cancel && policy.refund_percentage < 100 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-800">Late Cancellation</h5>
                      <p className="text-sm text-yellow-700">
                        Cancelling within 24 hours of departure incurs a fee and partial refund.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason Input */}
          {(!policy || policy.can_cancel) && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please tell us why you're cancelling..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isCancelling}
            >
              Keep Booking
            </Button>
            
            {(!policy || policy.can_cancel) && (
              <Button
                onClick={handleCancel}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel {type === 'ride' ? 'Ride' : 'Booking'}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}