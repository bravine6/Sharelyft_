import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Camera, 
  Edit, 
  Check, 
  X, 
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  Users
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    first_name: '',
    phone: '',
    user_type: 'passenger' as 'driver' | 'passenger'
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        phone: user.phone || '',
        user_type: user.user_type || 'passenger'
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Format phone number with +254 prefix
    if (name === 'phone') {
      let formattedPhone = value.replace(/\D/g, ''); // Remove non-digits
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+254' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('254') && !formattedPhone.startsWith('+254')) {
        formattedPhone = '+254' + formattedPhone;
      } else if (formattedPhone.startsWith('254')) {
        formattedPhone = '+' + formattedPhone;
      }
      setProfileData(prev => ({ ...prev, [name]: formattedPhone }));
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      await updateProfile(profileData);
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        phone: user.phone || '',
        user_type: user.user_type || 'passenger'
      });
    }
    setIsEditing(false);
    setError('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and account settings</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 p-4 rounded-md">
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Photo & Quick Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  {/* Profile Photo */}
                  <div className="relative mb-4">
                    <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                    <button className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-1/2 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    {user.first_name}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 capitalize">
                    {user.user_type}
                  </p>

                  {/* Verification Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Email</span>
                      <span className={`flex items-center ${user.email_verified ? 'text-green-600' : 'text-amber-600'}`}>
                        {user.email_verified ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Pending
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Phone</span>
                      <span className={`flex items-center ${user.phone_verified ? 'text-green-600' : 'text-amber-600'}`}>
                        {user.phone_verified ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Pending
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="first_name"
                        value={profileData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Enter your first name"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{user.first_name}</p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address
                    </label>
                    <p className="text-gray-900 py-2">{user.email}</p>
                    <p className="text-xs text-gray-500">Contact support to change email</p>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="+254712345678"
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{user.phone}</p>
                    )}
                    {isEditing && (
                      <p className="text-xs text-gray-500 mt-1">
                        Changing phone number will require re-verification
                      </p>
                    )}
                  </div>

                  {/* National ID (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ShieldCheck className="w-4 h-4 inline mr-2" />
                      National ID
                    </label>
                    <p className="text-gray-900 py-2">{user.national_id}</p>
                    <p className="text-xs text-gray-500">National ID cannot be changed</p>
                  </div>

                  {/* Date of Birth (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date of Birth
                    </label>
                    <p className="text-gray-900 py-2">{formatDate(user.date_of_birth)}</p>
                    <p className="text-xs text-gray-500">Date of birth cannot be changed</p>
                  </div>

                  {/* Gender (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Gender
                    </label>
                    <p className="text-gray-900 py-2 capitalize">{user.gender}</p>
                    <p className="text-xs text-gray-500">Gender cannot be changed</p>
                  </div>

                  {/* User Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Account Type
                    </label>
                    {isEditing ? (
                      <select
                        name="user_type"
                        value={profileData.user_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="passenger">Passenger</option>
                        <option value="driver">Driver</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 py-2 capitalize">{user.user_type}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}