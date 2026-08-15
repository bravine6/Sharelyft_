import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { User, Shield, CheckCircle, ArrowLeft, Loader, Car } from 'lucide-react';

interface PublicProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  profile_photo: string | null;
  bio: string | null;
  user_type: 'driver' | 'passenger';
  email_verified: boolean;
  phone_verified: boolean;
  verification_status: string | null;
  member_since: string;
  driver_documents_verified: number | null;
}

export default function PublicProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId) return;
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/profile/public/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load profile');
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profileId]);

  const memberSince = profile?.member_since
    ? new Date(profile.member_since).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={() => navigate('/dashboard')} className="mt-4">Back to Dashboard</Button>
            </CardContent>
          </Card>
        )}

        {profile && (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profile.profile_photo ? (
                    <img src={profile.profile_photo} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900">{profile.full_name || profile.first_name}</h1>
                  <p className="text-gray-600 capitalize flex items-center gap-2 mt-1">
                    {profile.user_type === 'driver' ? <Car className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {profile.user_type}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Member since {memberSince}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.email_verified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                        <CheckCircle className="w-3 h-3 mr-1" /> Email verified
                      </span>
                    )}
                    {profile.phone_verified && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                        <CheckCircle className="w-3 h-3 mr-1" /> Phone verified
                      </span>
                    )}
                    {profile.user_type === 'driver' && profile.verification_status === 'approved' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                        <Shield className="w-3 h-3 mr-1" /> Verified driver
                      </span>
                    )}
                    {profile.user_type === 'driver' && (profile.driver_documents_verified ?? 0) > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-xs font-medium">
                        <Shield className="w-3 h-3 mr-1" /> {profile.driver_documents_verified}/4 documents approved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t text-xs text-gray-500">
                Contact details (phone, email) are only shared after both parties pay the connection fee on a ride.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
