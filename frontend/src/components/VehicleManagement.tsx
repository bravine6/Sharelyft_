import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_URL } from '@/config';
import { 
  Car, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Users,
  Fuel,
  Settings,
  Check,
  X,
  AlertCircle,
  Shield
} from 'lucide-react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  air_conditioning: boolean;
  music_system: boolean;
  charging_ports: boolean;
  registration_number?: string;
  insurance_company?: string;
  insurance_expiry?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface VehicleForm {
  make: string;
  model: string;
  year: string;
  color: string;
  license_plate: string;
  seats: string;
  fuel_type: string;
  transmission: string;
  air_conditioning: boolean;
  music_system: boolean;
  charging_ports: boolean;
  registration_number: string;
  insurance_company: string;
  insurance_expiry: string;
}

export default function VehicleManagement() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<VehicleForm>({
    make: '',
    model: '',
    year: '',
    color: '',
    license_plate: '',
    seats: '4',
    fuel_type: 'petrol',
    transmission: 'manual',
    air_conditioning: false,
    music_system: false,
    charging_ports: false,
    registration_number: '',
    insurance_company: '',
    insurance_expiry: ''
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/vehicles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      } else {
        setError('Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Network error while fetching vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const url = editingVehicle 
        ? `${API_URL}/vehicles/${editingVehicle.id}`
        : `${API_URL}/vehicles`;
      
      const method = editingVehicle ? 'PUT' : 'POST';

      // Process form data to handle empty date fields
      const processedData = {
        ...formData,
        insurance_expiry: formData.insurance_expiry || null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(processedData)
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(result.message);
        fetchVehicles();
        handleCancelForm();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save vehicle');
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setError('Network error while saving vehicle');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year.toString(),
      color: vehicle.color,
      license_plate: vehicle.license_plate,
      seats: vehicle.seats.toString(),
      fuel_type: vehicle.fuel_type,
      transmission: vehicle.transmission,
      air_conditioning: vehicle.air_conditioning,
      music_system: vehicle.music_system,
      charging_ports: vehicle.charging_ports,
      registration_number: vehicle.registration_number || '',
      insurance_company: vehicle.insurance_company || '',
      insurance_expiry: vehicle.insurance_expiry || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Vehicle deleted successfully');
        fetchVehicles();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError('Network error while deleting vehicle');
    }
  };

  const handleSetDefault = async (vehicleId: string) => {
    try {
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Default vehicle updated');
        fetchVehicles();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to set default vehicle');
      }
    } catch (error) {
      console.error('Error setting default vehicle:', error);
      setError('Network error while setting default vehicle');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingVehicle(null);
    setFormData({
      make: '',
      model: '',
      year: '',
      color: '',
      license_plate: '',
      seats: '4',
      fuel_type: 'petrol',
      transmission: 'manual',
      air_conditioning: false,
      music_system: false,
      charging_ports: false,
      registration_number: '',
      insurance_company: '',
      insurance_expiry: ''
    });
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
            <Check className="w-3 h-3 mr-1" />
            Verified
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </div>
        );
      default:
        return (
          <div className="flex items-center bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
          <p className="text-gray-600">Manage your registered vehicles for ride sharing</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Vehicle Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Toyota"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Corolla"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., White"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Plate *
                  </label>
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., KBZ 123A"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Seats *
                  </label>
                  <select
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="2">2 seats</option>
                    <option value="3">3 seats</option>
                    <option value="4">4 seats</option>
                    <option value="5">5 seats</option>
                    <option value="6">6 seats</option>
                    <option value="7">7 seats</option>
                    <option value="8">8 seats</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="electric">Electric</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transmission
                  </label>
                  <select
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                  </select>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Vehicle Features
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.air_conditioning}
                      onChange={(e) => setFormData({ ...formData, air_conditioning: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Air Conditioning</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.music_system}
                      onChange={(e) => setFormData({ ...formData, music_system: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Music System</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.charging_ports}
                      onChange={(e) => setFormData({ ...formData, charging_ports: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Charging Ports</span>
                  </label>
                </div>
              </div>

              {/* Registration & Insurance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Company
                  </label>
                  <input
                    type="text"
                    value={formData.insurance_company}
                    onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Expiry
                  </label>
                  <input
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vehicles List */}
      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles registered</h3>
            <p className="text-gray-600 mb-4">Add your first vehicle to start offering rides</p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="relative">
              {vehicle.is_default && (
                <div className="absolute top-3 right-3">
                  <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Default
                  </div>
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-gray-600">{vehicle.year} • {vehicle.color}</p>
                    <p className="text-sm font-medium text-gray-900">{vehicle.license_plate}</p>
                  </div>
                  {getVerificationBadge(vehicle.verification_status)}
                </div>

                {/* Vehicle Details */}
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {vehicle.seats} seats
                  </div>
                  <div className="flex items-center">
                    <Fuel className="w-4 h-4 mr-1" />
                    {vehicle.fuel_type}
                  </div>
                  <div className="flex items-center">
                    <Settings className="w-4 h-4 mr-1" />
                    {vehicle.transmission}
                  </div>
                  {vehicle.insurance_expiry && (
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 mr-1" />
                      <span className="text-xs">
                        Expires {new Date(vehicle.insurance_expiry).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                {(vehicle.air_conditioning || vehicle.music_system || vehicle.charging_ports) && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {vehicle.air_conditioning && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">AC</span>
                    )}
                    {vehicle.music_system && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">Music</span>
                    )}
                    {vehicle.charging_ports && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Charging</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(vehicle)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  
                  {!vehicle.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(vehicle.id)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}