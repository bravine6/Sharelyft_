import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/config';
import { 
  Phone, 
  Mail, 
  User, 
  MessageSquare, 
  MapPin, 
  Clock, 
  Users,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ContactInformationProps {
  rideRequestId: string;
}

interface ContactInfo {
  type: 'driver' | 'passenger';
  name: string;
  phone: string;
  email: string;
}

interface RideDetails {
  origin: string;
  destination: string;
  departure_time: string;
  passengers: number;
}

interface ContactData {
  contact_info: ContactInfo;
  ride_details: RideDetails;
}

export default function ContactInformation({ rideRequestId }: ContactInformationProps) {
  const { token } = useAuth();
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchContactInformation();
  }, [rideRequestId]);

  const fetchContactInformation = async () => {
    try {
      const response = await fetch(`${API_URL}/service-fee/contact-info/${rideRequestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContactData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load contact information');
      }
    } catch (error) {
      console.error('Error fetching contact information:', error);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

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

  const openWhatsApp = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const whatsappNumber = cleanPhone.startsWith('254') ? cleanPhone : `254${cleanPhone.substring(1)}`;
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
  };

  const callNumber = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p>Loading contact information...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Access Restricted</h3>
          <p className="text-red-700">{error}</p>
          {error.includes('payment') && (
            <p className="text-red-600 text-sm mt-2">
              Both parties must pay the service fee to unlock contact information.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!contactData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Ride Details Card */}
      <Card className="bg-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-green-600" />
            Ride Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">From</p>
              <p className="font-medium">{contactData.ride_details.origin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">To</p>
              <p className="font-medium">{contactData.ride_details.destination}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Departure</p>
              <p className="font-medium flex items-center">
                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                {formatDate(contactData.ride_details.departure_time)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Passengers</p>
              <p className="font-medium flex items-center">
                <Users className="w-4 h-4 mr-1 text-gray-400" />
                {contactData.ride_details.passengers} passenger{contactData.ride_details.passengers > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-green-800">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            {contactData.contact_info.type === 'driver' ? 'Driver' : 'Passenger'} Contact Information
          </h3>

          <div className="space-y-4">
            {/* Name */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{contactData.contact_info.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(contactData.contact_info.name, 'name')}
                className="text-gray-500 hover:text-gray-700"
              >
                {copiedField === 'name' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{contactData.contact_info.phone}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => callNumber(contactData.contact_info.phone)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openWhatsApp(contactData.contact_info.phone)}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(contactData.contact_info.phone, 'phone')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {copiedField === 'phone' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{contactData.contact_info.email}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${contactData.contact_info.email}`, '_self')}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(contactData.contact_info.email, 'email')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {copiedField === 'email' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-100 rounded-lg">
            <p className="text-green-800 text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <strong>Connection Unlocked!</strong>
            </p>
            <p className="text-green-700 text-sm mt-1">
              You can now communicate directly with the {contactData.contact_info.type}. 
              Please coordinate your pickup details and stay safe!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}