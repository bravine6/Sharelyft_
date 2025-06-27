import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';

interface VehicleOption {
  id: string;
  label: string;
  details: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  seats: number;
  color: string;
}

export function useVehicleOptions() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicleOptions = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/vehicles/options`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to fetch vehicles');
        }
      } catch (err) {
        console.error('Error fetching vehicle options:', err);
        setError('Network error while fetching vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleOptions();
  }, [token]);

  return { vehicles, loading, error, refetch: () => {
    if (token) {
      const fetchVehicleOptions = async () => {
        try {
          setLoading(true);
          setError(null);

          const response = await fetch(`${API_URL}/vehicles/options`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setVehicles(data);
          } else {
            const errorData = await response.json();
            setError(errorData.message || 'Failed to fetch vehicles');
          }
        } catch (err) {
          console.error('Error fetching vehicle options:', err);
          setError('Network error while fetching vehicles');
        } finally {
          setLoading(false);
        }
      };

      fetchVehicleOptions();
    }
  }};
}