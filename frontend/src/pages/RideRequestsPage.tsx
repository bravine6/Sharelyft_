import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/config';
import { 
  MapPin, 
  Clock, 
  Users, 
  MessageSquare, 
  Check, 
  X, 
  Car,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface RideRequest {
  id: string;
  ride_id: string;
  passenger_id: string;
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
  };
}

export default function RideRequestsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Load ride requests for the driver
  const loadRideRequests = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all driver's rides first
        const ridesResponse = await fetch(`${API_URL}/rides`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!ridesResponse.ok) {
          throw new Error('Failed to load rides');
        }

        const rides = await ridesResponse.json();
        
        // For each ride, get its requests
        const allRequests: RideRequest[] = [];
        
        for (const ride of rides) {
          try {
            const requestsResponse = await fetch(`${API_URL}/rides/${ride.id}/requests`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (requestsResponse.ok) {
              const rideRequests = await requestsResponse.json();
              // Add ride info to each request
              const requestsWithRideInfo = rideRequests.map((req: any) => ({
                ...req,
                ride: ride
              }));
              allRequests.push(...requestsWithRideInfo);
            }
          } catch (err) {
            console.warn(`Failed to load requests for ride ${ride.id}:`, err);
          }
        }

        // Sort by created date (newest first)
        allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setRequests(allRequests);
      } catch (error) {
        console.error('Error loading ride requests:', error);
        setError('Failed to load ride requests');
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    if (token && user?.user_type === 'driver') {
      loadRideRequests();
    }
  }, [token, user]);

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

  const handleRequestResponse = async (requestId: string, rideId: string, status: 'accepted' | 'rejected') => {
    setProcessingRequest(requestId);
    
    try {
      const response = await fetch(`${API_URL}/rides/${rideId}/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Update the request status locally
        setRequests(prev => prev.map(req => 
          req.id === requestId ? { ...req, status } : req
        ));
      } else {
        const errorData = await response.json();
        alert(`Failed to ${status} request: ${errorData.message}`);
      }
    } catch (error) {
      console.error(`Error ${status}ing request:`, error);
      alert(`Network error while ${status}ing request`);
    } finally {
      setProcessingRequest(null);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Debug: Show user info
  console.log('Current user:', user);
  console.log('User type:', user?.user_type);

  // Only show for drivers
  if (user?.user_type !== 'driver') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">This page is only available for drivers.</p>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left max-w-md mx-auto">
            <p className="text-sm"><strong>Debug Info:</strong></p>
            <p className="text-sm">User Type: {user?.user_type || 'undefined'}</p>
            <p className="text-sm">User ID: {user?.id || 'undefined'}</p>
            <p className="text-sm">Name: {user?.first_name || 'undefined'}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ride Requests</h1>
          <p className="text-gray-600">Manage requests for your rides</p>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ride Requests</h1>
          <p className="text-gray-600">Manage requests for your rides</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Ride Requests</h1>
            <p className="text-gray-600">Manage requests for your rides</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
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
            <p className="text-gray-600">
              You haven't received any ride requests yet. 
              Make sure you have active ride offers to receive requests.
            </p>
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
                            <p className="text-sm font-medium text-gray-700">Message from passenger:</p>
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

                {request.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button
                      onClick={() => handleRequestResponse(request.id, request.ride_id, 'rejected')}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={processingRequest === request.id}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {processingRequest === request.id ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                      onClick={() => handleRequestResponse(request.id, request.ride_id, 'accepted')}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={processingRequest === request.id}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {processingRequest === request.id ? 'Processing...' : 'Accept'}
                    </Button>
                  </div>
                )}

                {request.status === 'accepted' && (
                  <div className="pt-4 border-t">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center text-green-800 mb-2">
                            <Badge className="bg-green-100 text-green-800 mr-2">Request Accepted</Badge>
                          </div>
                          <p className="text-green-700 text-sm">
                            Request accepted! The passenger can now start a chat with you from their side to coordinate pickup details.
                          </p>
                        </div>
                        <Button
                          onClick={() => navigate('/messages')}
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          View Messages
                        </Button>
                      </div>
                    </div>
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