import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/config';
import { 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Lock, 
  Unlock, 
  MessageSquare, 
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ServiceFeePaymentProps {
  rideRequestId: string;
  onPaymentSuccess?: () => void;
}

interface ConnectionStatus {
  is_unlocked: boolean;
  chat_enabled: boolean;
  contact_info_revealed: boolean;
  driver_paid: boolean;
  passenger_paid: boolean;
  user_paid: boolean;
  user_type: 'driver' | 'passenger';
  total_revenue_collected: number;
}

export default function ServiceFeePayment({ rideRequestId, onPaymentSuccess }: ServiceFeePaymentProps) {
  const { token } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectionStatus();
  }, [rideRequestId]);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/service-fee/connection-status/${rideRequestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      } else {
        setError('Failed to load connection status');
      }
    } catch (error) {
      console.error('Error fetching connection status:', error);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    // Validate payment method specific requirements
    if ((selectedPaymentMethod === 'mpesa' || selectedPaymentMethod === 'pesalink') && !mpesaPhone) {
      setError(`Please enter your ${selectedPaymentMethod === 'mpesa' ? 'M-Pesa' : ''} phone number`);
      return;
    }

    setIsProcessingPayment(true);
    setError(null);
    setSuccess(null);

    try {
      const paymentData = {
        rideRequestId: rideRequestId,
        paymentMethod: selectedPaymentMethod,
        ...(selectedPaymentMethod === 'mpesa' && { phoneNumber: mpesaPhone }),
        ...(selectedPaymentMethod === 'pesalink' && { phoneNumber: mpesaPhone })
      };

      const response = await fetch(`${API_URL}/payments/service-fee/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();

      if (response.ok) {
        let successMessage = 'Service fee payment initiated! 🎉';
        
        if (selectedPaymentMethod === 'mpesa') {
          successMessage = 'M-Pesa STK Push sent! Check your phone to complete payment.';
        } else if (selectedPaymentMethod === 'pesalink') {
          successMessage = 'PesaLink payment initiated! You should receive an SMS prompt.';
        } else if (selectedPaymentMethod === 'stripe') {
          successMessage = 'Card payment initiated! Complete payment to proceed.';
        }

        setSuccess(successMessage);
        await fetchConnectionStatus(); // Refresh status
        
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      } else {
        setError(data.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Network error during payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p>Loading connection status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!connectionStatus) {
    return (
      <Card className="bg-white border-red-200">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600">Failed to load connection status</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card className={`${connectionStatus.is_unlocked ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {connectionStatus.is_unlocked ? (
                <Unlock className="w-6 h-6 text-green-600 mr-2" />
              ) : (
                <Lock className="w-6 h-6 text-yellow-600 mr-2" />
              )}
              <h3 className="text-lg font-semibold">
                Connection {connectionStatus.is_unlocked ? 'Unlocked' : 'Locked'}
              </h3>
            </div>
            <Badge variant={connectionStatus.is_unlocked ? 'default' : 'secondary'} 
                   className={connectionStatus.is_unlocked ? 'bg-green-600' : 'bg-yellow-600'}>
              {connectionStatus.is_unlocked ? 'Active' : 'Pending Payment'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                connectionStatus.driver_paid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Driver Fee</p>
              <p className="text-xs text-gray-600">
                {connectionStatus.driver_paid ? 'Paid ✓' : 'Pending'}
              </p>
            </div>

            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                connectionStatus.passenger_paid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Passenger Fee</p>
              <p className="text-xs text-gray-600">
                {connectionStatus.passenger_paid ? 'Paid ✓' : 'Pending'}
              </p>
            </div>

            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                connectionStatus.chat_enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Chat</p>
              <p className="text-xs text-gray-600">
                {connectionStatus.chat_enabled ? 'Enabled' : 'Locked'}
              </p>
            </div>

            <div className="text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                connectionStatus.contact_info_revealed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                <Phone className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Contact Info</p>
              <p className="text-xs text-gray-600">
                {connectionStatus.contact_info_revealed ? 'Revealed' : 'Hidden'}
              </p>
            </div>
          </div>

          {connectionStatus.is_unlocked ? (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center text-green-800">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Connection Active!</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                You can now chat and exchange contact information. Total revenue collected: KSh {connectionStatus.total_revenue_collected}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center text-yellow-800">
                <Lock className="w-5 h-5 mr-2" />
                <span className="font-medium">Payment Required</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Both driver and passenger must pay KSh 50 each to unlock chat and contact features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Card */}
      {!connectionStatus.user_paid && (
        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Pay Service Fee - KSh 50 ({connectionStatus.user_type})
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4">
                <AlertCircle className="w-5 h-5 inline mr-2" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-md mb-4">
                <CheckCircle className="w-5 h-5 inline mr-2" />
                {success}
              </div>
            )}

            <div className="space-y-4">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedPaymentMethod('mpesa')}
                    className={`p-3 border rounded-lg flex items-center justify-center transition-colors ${
                      selectedPaymentMethod === 'mpesa' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 mr-2" />
                    M-Pesa
                  </button>
                  
                  <button
                    onClick={() => setSelectedPaymentMethod('stripe')}
                    className={`p-3 border rounded-lg flex items-center justify-center transition-colors ${
                      selectedPaymentMethod === 'stripe' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Card
                  </button>
                  
                  <button
                    onClick={() => setSelectedPaymentMethod('pesalink')}
                    className={`p-3 border rounded-lg flex items-center justify-center transition-colors ${
                      selectedPaymentMethod === 'pesalink' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    PesaLink
                  </button>
                </div>
              </div>

              {/* Payment Method Specific Fields */}
              {(selectedPaymentMethod === 'mpesa' || selectedPaymentMethod === 'pesalink') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedPaymentMethod === 'mpesa' ? 'M-Pesa Phone Number' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="0712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {selectedPaymentMethod === 'stripe' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center text-blue-800">
                    <CreditCard className="w-5 h-5 mr-2" />
                    <span className="font-medium">Credit/Debit Card Payment</span>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    You'll be redirected to complete your card payment securely.
                  </p>
                </div>
              )}

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessingPayment || (selectedPaymentMethod === 'mpesa' && !mpesaPhone)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    Pay KSh 50 Service Fee
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                This payment unlocks chat and contact information sharing between you and the other party.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Already Paid */}
      {connectionStatus.user_paid && !connectionStatus.is_unlocked && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Payment Completed!</h3>
            <p className="text-blue-700">
              You've paid your service fee. Waiting for the other party to pay their fee to unlock the connection.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}