import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DriverVerification from '@/components/DriverVerification';
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
  Users,
  Upload,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    first_name: '',
    phone: '',
    user_type: 'passenger' as 'driver' | 'passenger',
    national_id: '',
    date_of_birth: '',
    gender: '' as '' | 'male' | 'female' | 'other'
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        phone: user.phone || '',
        user_type: user.user_type || 'passenger',
        national_id: user.national_id || '',
        date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
        gender: (user.gender as '' | 'male' | 'female' | 'other') || ''
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

      // Strip empty optional fields so backend treats them as "not provided"
      const payload: Record<string, string> = {
        first_name: profileData.first_name,
        phone: profileData.phone,
        user_type: profileData.user_type,
      };
      if (profileData.national_id) payload.national_id = profileData.national_id;
      if (profileData.date_of_birth) payload.date_of_birth = profileData.date_of_birth;
      if (profileData.gender) payload.gender = profileData.gender;

      await updateProfile(payload as any);
      
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
        user_type: user.user_type || 'passenger',
        national_id: user.national_id || '',
        date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
        gender: (user.gender as '' | 'male' | 'female' | 'other') || ''
      });
    }
    setIsEditing(false);
    setError('');
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setError('');

      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload photo';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            // Handle non-JSON error responses
            const textResponse = await response.text();
            errorMessage = textResponse || response.statusText || errorMessage;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // Handle non-JSON success responses
          data = { 
            success: true, 
            message: 'Profile photo uploaded successfully',
            photo_url: null
          };
        }
      } catch (jsonError) {
        console.error('Error parsing success response:', jsonError);
        // If we can't parse JSON but response was ok, treat as success
        data = { 
          success: true, 
          message: 'Profile photo uploaded successfully',
          photo_url: null
        };
      }

      setSuccess('Profile photo updated successfully!');
      
      // Update user in context with new photo URL
      if (data.photo_url) {
        // Refresh user data to get the updated profile
        await refreshUser();
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateProfileCompleteness = () => {
    if (!user) return { percentage: 0, missing: [] };
    
    const requiredFields = [
      { field: 'first_name', label: 'First Name', value: user.first_name },
      { field: 'phone', label: 'Phone Number', value: user.phone },
      { field: 'profile_photo', label: 'Profile Photo', value: user.profile_photo },
      { field: 'email_verified', label: 'Email Verification', value: user.email_verified },
      { field: 'phone_verified', label: 'Phone Verification', value: user.phone_verified }
    ];

    // Add driver-specific requirements
    if (user.user_type === 'driver') {
      requiredFields.push(
        { field: 'driver_license', label: 'Driver License', value: user.driver_license_verified },
        { field: 'vehicle_insurance', label: 'Vehicle Insurance', value: user.vehicle_insurance_verified }
      );
    }

    const completed = requiredFields.filter(field => field.value).length;
    const missing = requiredFields.filter(field => !field.value).map(field => field.label);
    
    return {
      percentage: Math.round((completed / requiredFields.length) * 100),
      missing,
      completed,
      total: requiredFields.length
    };
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
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  {/* Profile Photo */}
                  <div className="relative mb-4">
                    <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {user.profile_photo ? (
                        <img 
                          src={user.profile_photo} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-16 h-16 text-gray-400" />
                      )}
                    </div>
                    <button 
                      onClick={triggerPhotoUpload}
                      disabled={isUploadingPhoto}
                      className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-1/2 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload profile photo"
                    >
                      {isUploadingPhoto ? (
                        <Upload className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
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

            {/* Profile Completeness */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Profile Completeness</h3>
                </div>
                
                {(() => {
                  const completeness = calculateProfileCompleteness();
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{completeness.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            completeness.percentage === 100 ? 'bg-green-600' : 
                            completeness.percentage >= 70 ? 'bg-blue-600' : 'bg-amber-600'
                          }`}
                          style={{ width: `${completeness.percentage}%` }}
                        ></div>
                      </div>
                      
                      {completeness.missing.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700 flex items-center">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mr-1" />
                            Missing Items:
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {completeness.missing.map((item, index) => (
                              <li key={index} className="flex items-center">
                                <X className="w-3 h-3 text-red-500 mr-2" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {completeness.percentage === 100 && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <p className="text-sm text-green-700 flex items-center">
                            <Check className="w-4 h-4 mr-2" />
                            Profile Complete!
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
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

                  {/* National ID — editable only when null */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ShieldCheck className="w-4 h-4 inline mr-2" />
                      National ID
                    </label>
                    {isEditing && !user.national_id ? (
                      <>
                        <input
                          type="text"
                          name="national_id"
                          value={profileData.national_id}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="7-8 digit National ID"
                        />
                        <p className="text-xs text-gray-500 mt-1">Cannot be changed after saving</p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-900 py-2">{user.national_id || 'Not set'}</p>
                        <p className="text-xs text-gray-500">
                          {user.national_id ? 'National ID cannot be changed' : 'Click Edit Profile to set this'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Date of Birth — editable only when null */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date of Birth
                    </label>
                    {isEditing && !user.date_of_birth ? (
                      <>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={profileData.date_of_birth}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Must be 18+. Cannot be changed after saving.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-900 py-2">{formatDate(user.date_of_birth)}</p>
                        <p className="text-xs text-gray-500">
                          {user.date_of_birth ? 'Date of birth cannot be changed' : 'Click Edit Profile to set this'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Gender — editable only when null */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Gender
                    </label>
                    {isEditing && !user.gender ? (
                      <>
                        <select
                          name="gender"
                          value={profileData.gender}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Cannot be changed after saving</p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-900 py-2 capitalize">{user.gender || 'Not set'}</p>
                        <p className="text-xs text-gray-500">
                          {user.gender ? 'Gender cannot be changed' : 'Click Edit Profile to set this'}
                        </p>
                      </>
                    )}
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

        {/* Driver Verification Section - Only show for drivers */}
        {user.user_type === 'driver' && (
          <div className="mt-8">
            <DriverVerification user={user} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}