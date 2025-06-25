import { useState, useEffect } from 'react';
import { API_URL } from '@/config';

export interface County {
  id: number;
  name: string;
  code: string;
}

export interface Town {
  id: number;
  name: string;
  county_id: number;
}

export const useCounties = () => {
  const [counties, setCounties] = useState<County[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounties = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/locations/counties`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch counties');
        }
        
        const data = await response.json();
        setCounties(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching counties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounties();
  }, []);

  return { counties, loading, error };
};

export const useTowns = () => {
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTowns = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/locations/towns`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch towns');
        }
        
        const data = await response.json();
        setTowns(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching towns:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTowns();
  }, []);

  return { towns, loading, error };
};

export const useTownsByCounty = (countyId: number | null) => {
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countyId) {
      setTowns([]);
      return;
    }

    const fetchTowns = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/locations/counties/${countyId}/towns`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch towns');
        }
        
        const data = await response.json();
        setTowns(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching towns:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTowns();
  }, [countyId]);

  return { towns, loading, error };
};

// Helper functions
export const getTownsByCounty = (towns: Town[], countyId: number): Town[] => {
  return towns.filter(town => town.county_id === countyId);
};

export const getCountyById = (counties: County[], id: number): County | undefined => {
  return counties.find(county => county.id === id);
};

export const getTownById = (towns: Town[], id: number): Town | undefined => {
  return towns.find(town => town.id === id);
};