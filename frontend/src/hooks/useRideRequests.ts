import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RideRequest {
  id: string;
  ride_id: string;
  passenger_id: string;
  passengers: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  ride?: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    price_per_seat: number;
    available_seats: number;
  };
}

export const usePendingRideRequests = (token: string | null) => {
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First get all driver's rides
        const ridesResponse = await fetch(`${API_URL}/rides`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!ridesResponse.ok) {
          throw new Error('Failed to fetch rides');
        }

        const rides = await ridesResponse.json();
        
        // For each ride, get its pending requests
        const allPendingRequests: RideRequest[] = [];
        
        for (const ride of rides) {
          try {
            const requestsResponse = await fetch(`${API_URL}/rides/${ride.id}/requests`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (requestsResponse.ok) {
              const rideRequests = await requestsResponse.json();
              // Filter only pending requests and add ride info
              const pendingRideRequests = rideRequests
                .filter((req: RideRequest) => req.status === 'pending')
                .map((req: RideRequest) => ({
                  ...req,
                  ride: ride
                }));
              
              allPendingRequests.push(...pendingRideRequests);
            }
          } catch (err) {
            console.warn(`Failed to load requests for ride ${ride.id}:`, err);
          }
        }

        // Sort by created date (newest first)
        allPendingRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setPendingRequests(allPendingRequests);
      } catch (error) {
        console.error('Error loading pending ride requests:', error);
        setError(error instanceof Error ? error.message : 'Failed to load pending requests');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRequests();
  }, [token]);

  return { pendingRequests, loading, error };
};