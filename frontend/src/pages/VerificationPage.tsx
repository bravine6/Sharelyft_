import DashboardLayout from '@/components/layout/DashboardLayout';
import { VerificationDashboard } from '@/components/VerificationDashboard';

export default function VerificationPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Verification</h1>
          <p className="text-gray-600">Verify your contact information to access all ShareLyft features</p>
        </div>

        {/* Verification Dashboard */}
        <VerificationDashboard />
      </div>
    </DashboardLayout>
  );
}