import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { useCounties, useTownsByCounty, getCountyById, getTownById } from '@/hooks/useLocations';
import { MapPin, Clock, Users, Car, Search, Filter, Calendar, DollarSign } from 'lucide-react';
import RideRequestModal from '@/components/RideRequestModal';

interface Ride {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  driver_id: string;
}

export default function FindRidesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    origin_county: '',
    origin_town: '',
    destination_county: '',
    destination_town: '',
    date: '',
  });
  
  // Fetch counties and towns from API
  const { counties, loading: countiesLoading } = useCounties();
  const { towns: originTowns, loading: originTownsLoading } = useTownsByCounty(
    searchParams.origin_county ? parseInt(searchParams.origin_county) : null
  );
  const { towns: destinationTowns, loading: destinationTownsLoading } = useTownsByCounty(
    searchParams.destination_county ? parseInt(searchParams.destination_county) : null
  );
  
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearched, setIsSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Clear town selection when county changes
    if (name === 'origin_county') {
      setSearchParams(prev => ({ ...prev, origin_county: value, origin_town: '' }));
    } else if (name === 'destination_county') {
      setSearchParams(prev => ({ ...prev, destination_county: value, destination_town: '' }));
    } else {
      setSearchParams(prev => ({ ...prev, [name]: value }));
    }
  };

  // Load available rides on component mount
  useEffect(() => {
    const loadAvailableRides = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/rides/available`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRides(data);
        } else {
          const errorData = await response.json();
          setError(`Failed to load rides: ${errorData.message}`);
        }
      } catch (error) {
        console.error('Error loading available rides:', error);
        setError('Network error while loading rides');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (token) {
      loadAvailableRides();
    }
  }, [token]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setIsSearched(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add location filters
      if (searchParams.origin) queryParams.append('origin', searchParams.origin);
      if (searchParams.destination) queryParams.append('destination', searchParams.destination);
      if (searchParams.origin_county) {
        const county = counties.find(c => c.id === parseInt(searchParams.origin_county));
        if (county) queryParams.append('origin_county', county.name);
      }
      if (searchParams.origin_town) {
        const town = originTowns.find(t => t.id === parseInt(searchParams.origin_town));
        if (town) queryParams.append('origin_town', town.name);
      }
      if (searchParams.destination_county) {
        const county = counties.find(c => c.id === parseInt(searchParams.destination_county));
        if (county) queryParams.append('destination_county', county.name);
      }
      if (searchParams.destination_town) {
        const town = destinationTowns.find(t => t.id === parseInt(searchParams.destination_town));
        if (town) queryParams.append('destination_town', town.name);
      }
      if (searchParams.date) queryParams.append('date', searchParams.date);
      
      const response = await fetch(`${API_URL}/rides/search?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRides(data);
      } else {
        const errorData = await response.json();
        setError(`Search failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error searching for rides:', error);
      setError('Network error during search');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleRequestRide = (ride: Ride) => {
    setSelectedRide(ride);
    setShowRequestModal(true);
  };

  const handleRequestSuccess = () => {
    // You could show a success message here
    alert('Ride request sent successfully! The driver will be notified.');
    // Optionally refresh the rides list
  };

  // Show error state if there's an error
  if (error) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Find Rides</h1>
          <p className="text-gray-600">Search for available rides to your destination</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Find Rides</h1>
        <p className="text-gray-600">Search for available rides to your destination</p>
      </div>

      <Card className="bg-white mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Origin Location */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">From</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="origin_county" className="block text-xs font-medium text-gray-600 mb-1">
                      County
                    </label>
                    <select
                      id="origin_county"
                      name="origin_county"
                      value={searchParams.origin_county}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={countiesLoading}
                    >
                      <option value="">
                        {countiesLoading ? 'Loading counties...' : 'Any County'}
                      </option>
                      {counties.map(county => (
                        <option key={county.id} value={county.id}>{county.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="origin_town" className="block text-xs font-medium text-gray-600 mb-1">
                      Town
                    </label>
                    <select
                      id="origin_town"
                      name="origin_town"
                      value={searchParams.origin_town}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={!searchParams.origin_county || originTownsLoading}
                    >
                      <option value="">
                        {!searchParams.origin_county ? 'Select county first' :
                         originTownsLoading ? 'Loading towns...' : 'Any Town'}
                      </option>
                      {originTowns.map(town => (
                        <option key={town.id} value={town.id}>{town.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Destination Location */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">To</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="destination_county" className="block text-xs font-medium text-gray-600 mb-1">
                      County
                    </label>
                    <select
                      id="destination_county"
                      name="destination_county"
                      value={searchParams.destination_county}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={countiesLoading}
                    >
                      <option value="">
                        {countiesLoading ? 'Loading counties...' : 'Any County'}
                      </option>
                      {counties.map(county => (
                        <option key={county.id} value={county.id}>{county.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="destination_town" className="block text-xs font-medium text-gray-600 mb-1">
                      Town
                    </label>
                    <select
                      id="destination_town"
                      name="destination_town"
                      value={searchParams.destination_town}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={!searchParams.destination_county || destinationTownsLoading}
                    >
                      <option value="">
                        {!searchParams.destination_county ? 'Select county first' :
                         destinationTownsLoading ? 'Loading towns...' : 'Any Town'}
                      </option>
                      {destinationTowns.map(town => (
                        <option key={town.id} value={town.id}>{town.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  When
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={searchParams.date}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                  disabled={isLoading}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {isLoading ? 'Searching...' : 'Search Rides'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-white sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Filters
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Range
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="mx-2">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departure Time
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Any time</option>
                    <option value="morning">Morning (6AM - 12PM)</option>
                    <option value="afternoon">Afternoon (12PM - 6PM)</option>
                    <option value="evening">Evening (6PM - 12AM)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seats Required
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="1">1 seat</option>
                    <option value="2">2 seats</option>
                    <option value="3">3 seats</option>
                    <option value="4">4+ seats</option>
                  </select>
                </div>
                
                <Button className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 mt-2">
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Available Rides</h2>
                <span className="text-sm text-gray-500">
                  {rides.length} ride{rides.length !== 1 ? 's' : ''} found
                </span>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : rides.length > 0 ? (
                <div className="space-y-4">
                  {rides.map((ride) => (
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
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-green-600">{ride.price_per_seat} KSh</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Users className="w-4 h-4 mr-1" />
                            {ride.available_seats} seats available
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Car className="w-4 h-4 mr-1" />
                          Driver ID: {ride.driver_id}
                        </div>
                        <div className="flex space-x-2">
                          <Link to={`/rides/${ride.id}`}>
                            <Button size="sm" variant="outline">View Details</Button>
                          </Link>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleRequestRide(ride)}
                          >
                            Request Ride
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {isSearched ? (
                    <>
                      <p>No rides found matching your search criteria.</p>
                      <p className="mt-2">Try adjusting your search parameters or check back later.</p>
                    </>
                  ) : (
                    <>
                      <p>No rides available at the moment.</p>
                      <p className="mt-2">Check back later or try searching with different criteria.</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ride Request Modal */}
      {selectedRide && (
        <RideRequestModal
          ride={selectedRide}
          isOpen={showRequestModal}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedRide(null);
          }}
          onSuccess={handleRequestSuccess}
          token={token || ''}
        />
      )}
    </DashboardLayout>
  );
}