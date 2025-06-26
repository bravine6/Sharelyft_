import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { MapPin, Clock, Users, Car, Search, PlusCircle, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRideStatistics, useRecentActivity } from '@/hooks/useRideStatistics';
import { usePendingRideRequests } from '@/hooks/useRideRequests';
import { VerificationBanner } from '@/components/VerificationBanner';

interface Ride {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  driver_id: string;
  driver?: {
    name: string;
    id: string;
  };
}

export default function DashboardPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [upcomingRides, setUpcomingRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { statistics, loading: statsLoading } = useRideStatistics();
  const { activities, loading: activityLoading } = useRecentActivity();
  const { pendingRequests, loading: requestsLoading } = usePendingRideRequests(token);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching rides with token:', token ? 'exists' : 'missing');
        
        const response = await fetch(`${API_URL}/rides`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Rides API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Rides data:', data);
          
          // Filter to only show upcoming rides (future departure time)
          const upcoming = data.filter((ride: Ride) => 
            new Date(ride.departure_time) > new Date()
          ).slice(0, 3); // Only show 3 upcoming rides
          
          setUpcomingRides(upcoming);
        } else {
          const errorData = await response.json();
          setError(`Failed to fetch rides: ${errorData.message || response.status}`);
        }
      } catch (error) {
        console.error('Error fetching rides:', error);
        setError('Network error while fetching rides');
      } finally {
        setIsLoading(false);
      }
    };

    if (token && !authLoading) {
      fetchRides();
    } else if (!authLoading && !token) {
      setIsLoading(false);
      setError('No authentication token available');
    }
  }, [token, authLoading]);

  // Format date for display
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

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.first_name}!</p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
          <p><strong>Error:</strong> {error}</p>
          <p className="text-sm mt-2">Check the browser console for more details.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.first_name}!</p>
      </div>

      {/* Verification Banner */}
      <VerificationBanner />

      {/* Pending Ride Requests Alert for Drivers */}
      {user?.user_type === 'driver' && !requestsLoading && pendingRequests.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <div>
                  <h3 className="font-semibold text-yellow-800">
                    {pendingRequests.length} Pending Ride Request{pendingRequests.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-yellow-700">
                    You have ride requests waiting for your response
                  </p>
                </div>
              </div>
              <Link to="/ride-requests">
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  View Requests
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accepted Requests Alert for Passengers */}
      {user?.user_type === 'passenger' && (
        <Card className="bg-blue-50 border-blue-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <h3 className="font-semibold text-blue-800">
                    Service Fee Payment Required
                  </h3>
                  <p className="text-sm text-blue-700">
                    Check your ride requests for accepted rides that need payment
                  </p>
                </div>
              </div>
              <Link to="/my-ride-requests">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  View My Requests
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-col space-y-3">
              <Link to="/find-rides">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white justify-start">
                  <Search className="mr-2 h-5 w-5" />
                  Find a Ride
                </Button>
              </Link>
              {user?.user_type === 'driver' && (
                <Link to="/offer-ride">
                  <Button variant="outline" className="w-full justify-start">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Offer a Ride
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Your Stats</h2>
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">
                    {user?.user_type === 'driver' ? 'Rides Offered' : 'Rides Taken'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {user?.user_type === 'driver' 
                      ? statistics?.ridesOffered || 0 
                      : statistics?.ridesTaken || 0}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Completed Rides</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics?.ridesCompleted || 0}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">
                    {user?.user_type === 'driver' ? 'Total Earnings' : 'Total Spent'}
                  </p>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                    <p className="text-2xl font-bold text-gray-900">
                      {user?.user_type === 'driver' 
                        ? statistics?.totalEarnings || 0 
                        : statistics?.totalSpent || 0} KSh
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Upcoming Rides</h2>
                <Link to="/my-rides" className="text-green-600 text-sm hover:underline">
                  View all
                </Link>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : upcomingRides.length > 0 ? (
                <div className="space-y-4">
                  {upcomingRides.map((ride) => (
                    <div key={ride.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center text-gray-900 font-medium">
                            <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                            {ride.origin} → {ride.destination}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(ride.departure_time)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{ride.price_per_seat} KSh</div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Users className="w-4 h-4 mr-1" />
                            {ride.available_seats} seats
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Car className="w-4 h-4 mr-1" />
                          Driver: {ride.driver?.name || 'Unknown'}
                        </div>
                        <Link to={`/rides/${ride.id}`}>
                          <Button size="sm" variant="outline">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>You don't have any upcoming rides.</p>
                  <p className="mt-2">
                    <Link to="/find-rides" className="text-green-600 hover:underline">
                      Find a ride
                    </Link> or <Link to="/offer-ride" className="text-green-600 hover:underline">
                      offer a ride
                    </Link>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-white">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              {activityLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.slice(0, 5).map((activity) => (
                    <Link 
                      key={activity.id} 
                      to={activity.type === 'ride_offered' ? '/my-rides' : '/ride-requests'}
                      className="block"
                    >
                      <div className="border rounded-lg p-3 hover:shadow-sm hover:bg-gray-50 transition-all cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${
                                activity.type === 'ride_offered' ? 'bg-blue-500' : 'bg-green-500'
                              }`}></div>
                              <span className="font-medium text-gray-900 text-sm">{activity.title}</span>
                            </div>
                            <p className="text-sm text-gray-600 ml-4">{activity.description}</p>
                            <p className="text-xs text-gray-500 ml-4 mt-1">
                              {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-gray-400 ml-2">
                            →
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Link to="/my-rides">
                    <Button variant="ghost" size="sm" className="w-full text-green-600">
                      View All Activity
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent activity</p>
                  <p className="text-xs mt-1">Start offering or booking rides!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}