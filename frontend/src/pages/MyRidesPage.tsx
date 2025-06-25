import { useState, useEffect } from 'react';
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
  DollarSign,
  Car,
  Edit,
  Trash2
} from 'lucide-react';

interface Ride {
  id: string;
  origin: string;
  destination: string;
  origin_county?: string;
  origin_town?: string;
  destination_county?: string;
  destination_town?: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  vehicle_info?: any;
  route_info?: any;
  created_at: string;
}


export default function MyRidesPage() {
  const { user, token } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRides();
  }, [user]);

  const fetchMyRides = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/rides`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rides');
      }

      const data = await response.json();
      setRides(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching rides:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteRide = async (rideId: string) => {
    if (!confirm('Are you sure you want to delete this ride?')) return;

    try {
      const response = await fetch(`${API_URL}/rides/${rideId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete ride');
      }

      // Remove ride from local state
      setRides(rides.filter(ride => ride.id !== rideId));
    } catch (err: any) {
      alert('Error deleting ride: ' + err.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading your rides...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Rides</h1>
        <p className="text-gray-600">
          {user?.user_type === 'driver' 
            ? 'Manage the rides you\'ve offered' 
            : 'View your ride bookings'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {rides.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rides found</h3>
            <p className="text-gray-600 mb-6">
              {user?.user_type === 'driver' 
                ? 'You haven\'t offered any rides yet.'
                : 'You haven\'t booked any rides yet.'}
            </p>
            <Button 
              onClick={() => window.location.href = user?.user_type === 'driver' ? '/offer-ride' : '/find-rides'}
              className="bg-green-600 hover:bg-green-700"
            >
              {user?.user_type === 'driver' ? 'Offer a Ride' : 'Find a Ride'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <Card key={ride.id} className="bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(ride.status)}>
                      {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Created {formatDate(ride.created_at)}
                    </span>
                  </div>
                  
                  {user?.user_type === 'driver' && ride.status === 'active' && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: Edit functionality */}}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRide(ride.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">From</p>
                      <p className="font-medium">{ride.origin}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">To</p>
                      <p className="font-medium">{ride.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Departure</p>
                      <p className="font-medium">
                        {formatDate(ride.departure_time)} at {formatTime(ride.departure_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Price per seat</p>
                      <p className="font-medium">KSh {ride.price_per_seat}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {ride.available_seats} seats available
                      </span>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}