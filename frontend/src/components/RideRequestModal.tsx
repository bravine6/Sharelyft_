import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { API_URL } from '@/config';
import { X, Users, MapPin, Clock, DollarSign } from 'lucide-react';

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

interface RideRequestModalProps {
  ride: Ride;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

const RideRequestModal: React.FC<RideRequestModalProps> = ({
  ride,
  isOpen,
  onClose,
  onSuccess,
  token
}) => {
  const [passengers, setPassengers] = useState(1);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

  const totalCost = passengers * ride.price_per_seat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passengers > ride.available_seats) {
      setError(`Only ${ride.available_seats} seats available`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Making ride request...');
      console.log('URL:', `${API_URL}/rides/${ride.id}/request`);
      console.log('Token:', token);
      console.log('Payload:', { passengers, message: message.trim() || undefined });

      // Try both regular endpoint and debug endpoint
      const debugResponse = await fetch(`${API_URL.replace('/api', '')}/debug-ride-request/${ride.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passengers,
          message: message.trim() || undefined,
          debug: true
        })
      });
      
      console.log('🔍 Debug response status:', debugResponse.status);
      console.log('🔍 Debug response:', await debugResponse.text());

      const response = await fetch(`${API_URL}/rides/${ride.id}/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passengers,
          message: message.trim() || undefined
        })
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to request ride');
      }
    } catch (error) {
      console.error('Error requesting ride:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-white w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Request Ride</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Ride Details */}
          <div className="border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="flex items-center text-gray-900 font-medium mb-2">
              <MapPin className="w-4 h-4 mr-1 text-gray-400" />
              {ride.origin} → {ride.destination}
            </div>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Clock className="w-4 h-4 mr-1" />
              {formatDate(ride.departure_time)}
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                {ride.available_seats} seats available
              </div>
              <div className="flex items-center text-green-600 font-semibold">
                <DollarSign className="w-4 h-4" />
                {ride.price_per_seat} KSh per seat
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Number of Passengers */}
            <div>
              <label htmlFor="passengers" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Passengers
              </label>
              <select
                id="passengers"
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {Array.from({ length: Math.min(ride.available_seats, 4) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} passenger{i + 1 > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message to Driver (Optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Any special requests or pickup instructions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Total Cost */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Cost:</span>
                <span className="text-green-600">{totalCost} KSh</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {passengers} passenger{passengers > 1 ? 's' : ''} × {ride.price_per_seat} KSh
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Requesting...' : 'Request Ride'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RideRequestModal;