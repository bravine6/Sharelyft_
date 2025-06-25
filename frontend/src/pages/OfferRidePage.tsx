import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { useCounties, useTownsByCounty } from '@/hooks/useLocations';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  Car, 
  Info, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

export default function OfferRidePage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    origin_county: '',
    origin_town: '',
    destination_county: '',
    destination_town: '',
    date: '',
    time: '',
    available_seats: 1,
    price: '',
    vehicle_id: '', // User must select
    description: ''
  });
  
  // Fetch counties and towns from API
  const { counties, loading: countiesLoading } = useCounties();
  const { towns: originTowns, loading: originTownsLoading } = useTownsByCounty(
    formData.origin_county ? parseInt(formData.origin_county) : null
  );
  const { towns: destinationTowns, loading: destinationTownsLoading } = useTownsByCounty(
    formData.destination_county ? parseInt(formData.destination_county) : null
  );
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Clear town selection when county changes
    if (name === 'origin_county') {
      setFormData(prev => ({ ...prev, origin_county: value, origin_town: '' }));
    } else if (name === 'destination_county') {
      setFormData(prev => ({ ...prev, destination_county: value, destination_town: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Debug: Log user data
  console.log('OfferRidePage - Current user:', user);
  console.log('OfferRidePage - User type:', user?.user_type);
  console.log('OfferRidePage - User type check:', user?.user_type !== 'driver');

  // Only allow drivers to access this page
  if (user?.user_type !== 'driver') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">Only drivers can offer rides.</p>
          <p className="text-sm text-gray-500 mb-6">
            To offer rides, you need to register as a driver or upgrade your account.
          </p>
          <div className="space-x-4">
            <Button 
              onClick={() => navigate('/find-rides')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Find Rides Instead
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    // Form validation
    if (!formData.origin_county || !formData.origin_town || 
        !formData.destination_county || !formData.destination_town ||
        !formData.date || !formData.time || !formData.price || !formData.vehicle_id) {
      setFormError('All required fields must be filled');
      return;
    }
    
    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setFormError('Price must be a positive number');
      return;
    }
    
    // Get county and town names for display
    const originCounty = counties.find(c => c.id === parseInt(formData.origin_county));
    const originTown = originTowns.find(t => t.id === parseInt(formData.origin_town));
    const destinationCounty = counties.find(c => c.id === parseInt(formData.destination_county));
    const destinationTown = destinationTowns.find(t => t.id === parseInt(formData.destination_town));
    
    // Prepare data for API
    const rideData = {
      origin: `${originTown?.name}, ${originCounty?.name}`,
      destination: `${destinationTown?.name}, ${destinationCounty?.name}`,
      origin_county: originCounty?.name,
      origin_town: originTown?.name,
      destination_county: destinationCounty?.name,
      destination_town: destinationTown?.name,
      departure_time: `${formData.date}T${formData.time}:00.000Z`,
      available_seats: parseInt(formData.available_seats.toString()),
      price_per_seat: priceValue,
      vehicle_id: formData.vehicle_id,
      description: formData.description
    };
    
    setIsSubmitting(true);
    
    try {
      // Create ride via API
      const response = await fetch(`${API_URL}/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rideData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ride');
      }
      
      await response.json();
      
      setFormSuccess('Your ride has been posted successfully!');
      
      // Reset form
      setFormData({
        origin: '',
        destination: '',
        origin_county: '',
        origin_town: '',
        destination_county: '',
        destination_town: '',
        date: '',
        time: '',
        available_seats: 1,
        price: '',
        vehicle_id: '',
        description: ''
      });
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/my-rides');
      }, 2000);
      
    } catch (error: any) {
      setFormError(error.message || 'An error occurred while posting your ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offer a Ride</h1>
        <p className="text-gray-600">Share your journey and help others travel with you</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-white">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Ride Details</h2>
              
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4 flex items-start">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <p>{formError}</p>
                </div>
              )}
              
              {formSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-md mb-4 flex items-start">
                  <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <p>{formSuccess}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Origin Location */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    From <span className="text-red-500">*</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="origin_county" className="block text-xs font-medium text-gray-600 mb-1">
                        County
                      </label>
                      <select
                        id="origin_county"
                        name="origin_county"
                        value={formData.origin_county}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                        disabled={countiesLoading}
                      >
                        <option value="">
                          {countiesLoading ? 'Loading counties...' : 'Select County'}
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
                        value={formData.origin_town}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                        disabled={!formData.origin_county || originTownsLoading}
                      >
                        <option value="">
                          {!formData.origin_county ? 'Select county first' : 
                           originTownsLoading ? 'Loading towns...' : 'Select Town'}
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
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    To <span className="text-red-500">*</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="destination_county" className="block text-xs font-medium text-gray-600 mb-1">
                        County
                      </label>
                      <select
                        id="destination_county"
                        name="destination_county"
                        value={formData.destination_county}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                        disabled={countiesLoading}
                      >
                        <option value="">
                          {countiesLoading ? 'Loading counties...' : 'Select County'}
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
                        value={formData.destination_town}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                        disabled={!formData.destination_county || destinationTownsLoading}
                      >
                        <option value="">
                          {!formData.destination_county ? 'Select county first' : 
                           destinationTownsLoading ? 'Loading towns...' : 'Select Town'}
                        </option>
                        {destinationTowns.map(town => (
                          <option key={town.id} value={town.id}>{town.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        id="time"
                        name="time"
                        type="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="available_seats" className="block text-sm font-medium text-gray-700 mb-1">
                      Available Seats <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <select
                        id="available_seats"
                        name="available_seats"
                        value={formData.available_seats}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="1">1 seat</option>
                        <option value="2">2 seats</option>
                        <option value="3">3 seats</option>
                        <option value="4">4 seats</option>
                        <option value="5">5 seats</option>
                        <option value="6">6 seats</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price (KSh) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        id="price"
                        name="price"
                        type="number"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Price per passenger"
                        min="50"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      id="vehicle_id"
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Vehicle</option>
                      <option value="1">Toyota Corolla (KBZ 123A)</option>
                      <option value="2">Nissan Sentra (KCA 456B)</option>
                      <option value="3">Honda Civic (KDB 789C)</option>
                      <option value="4">Subaru Forester (KDC 012D)</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Information
                  </label>
                  <div className="relative">
                    <Info className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Any details you'd like passengers to know (e.g., meeting point, luggage space, etc.)"
                      rows={3}
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting Your Ride...' : 'Post Your Ride'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-white sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Tips for Drivers</h2>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-semibold">1</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">Set a Fair Price</h3>
                    <p className="text-gray-600">Consider fuel costs, distance, and comfort. Aim for a price that's cheaper than taxis but fair for your effort.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-semibold">2</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">Be Specific</h3>
                    <p className="text-gray-600">Include details about meeting points, luggage space, and any other important information.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-semibold">3</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">Be Punctual</h3>
                    <p className="text-gray-600">Always arrive at the pickup location on time. It's good practice to be there 5-10 minutes early.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 font-semibold">4</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">Verify Passengers</h3>
                    <p className="text-gray-600">Always check your passengers' profiles and reviews before accepting their ride requests.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-gray-50 p-4 rounded-lg text-sm">
                <h3 className="font-medium text-gray-900 mb-2">Remember</h3>
                <p className="text-gray-600">
                  ShareLyft charges a flat fee of KSh 50 for each successful connection. This is billed once a passenger's request is accepted.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}