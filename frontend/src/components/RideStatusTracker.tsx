import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Car, 
  MapPin,
  RefreshCw,
  AlertCircle,
  Phone,
  MessageSquare
} from 'lucide-react';

interface RideStatus {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  passengers: number;
  created_at: string;
  updated_at: string;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    driver_id: string;
    status: string;
  };
}

interface RideStatusTrackerProps {
  rideRequestId: string;
  onStatusChange?: (status: string) => void;
  showActions?: boolean;
}

const RideStatusTracker: React.FC<RideStatusTrackerProps> = ({ 
  rideRequestId, 
  onStatusChange,
  showActions = true 
}) => {
  const { token } = useAuth();
  const [rideStatus, setRideStatus] = useState<RideStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchRideStatus();
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchRideStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [rideRequestId, token]);

  const fetchRideStatus = async () => {
    try {
      if (!token) return;
      
      setError(null);
      
      const response = await fetch(`${API_URL}/rides/requests/${rideRequestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRideStatus(data);
        setLastUpdated(new Date());
        
        if (onStatusChange && data.status !== rideStatus?.status) {
          onStatusChange(data.status);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to fetch ride status');
      }
    } catch (error) {
      console.error('Error fetching ride status:', error);
      setError('Network error while fetching status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          badge: (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          ),
          message: 'Waiting for driver response...',
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          color: 'yellow'
        };
      
      case 'accepted':
        return {
          badge: (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Accepted
            </Badge>
          ),
          message: 'Your ride request has been accepted!',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          color: 'green'
        };
      
      case 'rejected':
        return {
          badge: (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <XCircle className="w-3 h-3 mr-1" />
              Rejected
            </Badge>
          ),
          message: 'Request was declined by the driver.',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          color: 'red'
        };
      
      case 'completed':
        return {
          badge: (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Car className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          ),
          message: 'Ride completed successfully!',
          icon: <Car className="w-5 h-5 text-blue-500" />,
          color: 'blue'
        };
      
      case 'cancelled':
        return {
          badge: (
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
              <XCircle className="w-3 h-3 mr-1" />
              Cancelled
            </Badge>
          ),
          message: 'Ride was cancelled.',
          icon: <XCircle className="w-5 h-5 text-gray-500" />,
          color: 'gray'
        };
      
      default:
        return {
          badge: <Badge variant="secondary">{status}</Badge>,
          message: 'Status unknown',
          icon: <AlertCircle className="w-5 h-5 text-gray-500" />,
          color: 'gray'
        };
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (isLoading && !rideStatus) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Loading status...</span>
      </div>
    );
  }

  if (error && !rideStatus) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-center text-red-800">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span className="font-medium">Error</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRideStatus}
          className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (!rideStatus) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No ride status available</p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(rideStatus.status);

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {statusConfig.icon}
          <div>
            <div className="flex items-center space-x-2">
              {statusConfig.badge}
              <span className="text-sm text-gray-500">
                Updated {formatRelativeTime(lastUpdated)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{statusConfig.message}</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRideStatus}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Ride Details */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center text-sm text-gray-700">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span>{rideStatus.ride.origin} → {rideStatus.ride.destination}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 mt-1">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          <span>{new Date(rideStatus.ride.departure_time).toLocaleString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && rideStatus.status === 'accepted' && (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Phone className="w-4 h-4 mr-2" />
            Contact Driver
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>
        </div>
      )}

      {/* Status Timeline */}
      <div className="border-t pt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Status Timeline</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
            <span>Request created: {new Date(rideStatus.created_at).toLocaleString()}</span>
          </div>
          {rideStatus.updated_at !== rideStatus.created_at && (
            <div className="flex items-center text-gray-600">
              <div className={`w-2 h-2 bg-${statusConfig.color}-400 rounded-full mr-3`}></div>
              <span>Status updated: {new Date(rideStatus.updated_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideStatusTracker;