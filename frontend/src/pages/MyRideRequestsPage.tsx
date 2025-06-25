import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ServiceFeePayment from '@/components/ServiceFeePayment';
import ContactInformation from '@/components/ContactInformation';
import { API_URL } from '@/config';
import { 
  MapPin, 
  Clock, 
  Users, 
  MessageSquare, 
  Car,
  AlertCircle,
  RefreshCw,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface RideRequest {
  id: string;
  ride_id: string;
  passengers: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    price_per_seat: number;
    available_seats: number;
    driver_id: string;
  };
  payment_status?: {
    passenger_paid: boolean;
    payment_required: boolean;
    connection_unlocked: boolean;
    chat_enabled: boolean;
    contact_info_revealed: boolean;
  };
}

export default function MyRideRequestsPage() {
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_type === 'passenger' && token) {
      loadRideRequests();
    } else if (user?.user_type !== 'passenger') {
      setIsLoading(false);
    }
  }, [user, token]);

  const loadRideRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch passenger's ride requests
      const response = await fetch(`${API_URL}/rides/my-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Ride requests data:', data);
        setRequests(data || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', response.status, errorData);
        setError(`Failed to load ride requests: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error loading ride requests:', error);
      setError('Network error while loading ride requests');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Only show for passengers
  if (user?.user_type !== 'passenger') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">This page is only available for passengers.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Ride Requests</h1>
          <p className="text-gray-600">Track your ride requests and manage connections</p>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Ride Requests</h1>
          <p className="text-gray-600">Track your ride requests and manage connections</p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
          <p><strong>Error:</strong> {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Ride Requests</h1>
            <p className="text-gray-600">Track your ride requests and manage connections</p>
          </div>
          <Button
            variant="outline"
            onClick={loadRideRequests}
            className="flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Ride Requests</h3>
            <p className="text-gray-600 mb-4">
              You haven't made any ride requests yet.
            </p>
            <Button 
              onClick={() => window.location.href = '/find-rides'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Find a Ride
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-lg font-semibold text-gray-900">
                        <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                        {request.ride.origin} → {request.ride.destination}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(request.ride.departure_time)}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{request.passengers} passenger{request.passengers > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-green-600">
                          {request.passengers * request.ride.price_per_seat} KSh total
                        </span>
                      </div>
                    </div>

                    {request.message && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <div className="flex items-start">
                          <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Your message:</p>
                            <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Requested {formatDate(request.created_at)}
                    </p>
                  </div>
                </div>

                {/* Pending Status */}
                {request.status === 'pending' && (
                  <div className="pt-4 border-t">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center text-yellow-800">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Waiting for Driver Response</span>
                      </div>
                      <p className="text-yellow-700 text-sm mt-1">
                        Your ride request is pending. The driver will respond soon.
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejected Status */}
                {request.status === 'rejected' && (
                  <div className="pt-4 border-t">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center text-red-800">
                        <XCircle className="w-4 h-4 mr-2" />
                        <span className="font-medium">Request Declined</span>
                      </div>
                      <p className="text-red-700 text-sm mt-1">
                        Unfortunately, the driver declined your request. Try booking another ride.
                      </p>
                    </div>
                  </div>
                )}

                {/* Accepted Status - Payment Required */}
                {request.status === 'accepted' && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Request Accepted!
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {expandedRequest === request.id ? 'Hide' : 'Pay Service Fee'}
                      </Button>
                    </div>
                    
                    {expandedRequest === request.id && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center text-green-800">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Great News!</span>
                          </div>
                          <p className="text-green-700 text-sm mt-1">
                            Your ride request has been accepted! Pay the KSh 50 service fee to unlock chat and contact features.
                          </p>
                        </div>
                        
                        <ServiceFeePayment 
                          rideRequestId={request.id}
                          onPaymentSuccess={() => {
                            loadRideRequests();
                          }}
                        />
                        <ContactInformation rideRequestId={request.id} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}