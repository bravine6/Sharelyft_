import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import VehicleManagement from '@/components/VehicleManagement';

export default function VehiclesPage() {
  const { user } = useAuth();

  // Only drivers should access this page
  if (user?.user_type !== 'driver') {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-4">Vehicle management is only available for drivers.</p>
          <p className="text-sm text-gray-500 mb-6">
            To access vehicle management, please switch your account type to driver in your profile settings.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VehicleManagement />
      </div>
    </DashboardLayout>
  );
}