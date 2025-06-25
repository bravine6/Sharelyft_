import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RideStatistics {
  ridesOffered: number;
  ridesCompleted: number;
  ridesTaken: number;
  totalEarnings: number;
  totalSpent: number;
}

interface Activity {
  id: string;
  type: 'ride_offered' | 'ride_request';
  title: string;
  description: string;
  timestamp: string;
  data: any;
}

export const useRideStatistics = () => {
  const [statistics, setStatistics] = useState<RideStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/rides/statistics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch ride statistics');
        }

        const data = await response.json();
        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  return { statistics, loading, error };
};

export const useRecentActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/rides/activity`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recent activity');
        }

        const data = await response.json();
        setActivities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activity');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return { activities, loading, error };
};