import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Car,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface DriverVerificationProps {
  user: any;
}

type DocStatus = 'pending' | 'uploaded' | 'verified' | 'rejected';

interface DocTypeConfig {
  type: 'license' | 'insurance' | 'registration' | 'photo';
  label: string;
  description: string;
  required: boolean;
  icon: JSX.Element;
}

interface BackendDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  status: DocStatus;
  uploaded_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const DOC_TYPES: DocTypeConfig[] = [
  {
    type: 'license',
    label: "Driver's License",
    description: 'Clear photo of your valid driver\'s license (front and back)',
    required: true,
    icon: <FileText className="w-6 h-6 text-blue-500" />
  },
  {
    type: 'insurance',
    label: 'Vehicle Insurance',
    description: 'Current vehicle insurance certificate',
    required: true,
    icon: <Shield className="w-6 h-6 text-green-500" />
  },
  {
    type: 'registration',
    label: 'Vehicle Registration',
    description: 'Vehicle registration documents (logbook)',
    required: true,
    icon: <Car className="w-6 h-6 text-purple-500" />
  },
  {
    type: 'photo',
    label: 'Verification Photo',
    description: 'Clear photo of yourself for identity verification',
    required: true,
    icon: <User className="w-6 h-6 text-orange-500" />
  }
];

export default function DriverVerification({ user: _user }: DriverVerificationProps) {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [docsByType, setDocsByType] = useState<Record<string, BackendDocument>>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const fetchVerificationStatus = useCallback(async (mode: 'initial' | 'manual' = 'initial') => {
    try {
      if (mode === 'manual') setIsRefreshing(true);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/driver/verification/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return;

      const payload = await response.json();
      const documents: BackendDocument[] = payload?.data?.documents || [];

      // Keep the most recent document per type (backend already orders by created_at desc)
      const byType: Record<string, BackendDocument> = {};
      for (const doc of documents) {
        if (!byType[doc.document_type]) {
          byType[doc.document_type] = doc;
        }
      }
      setDocsByType(byType);
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVerificationStatus('initial');
  }, [fetchVerificationStatus]);

  // Re-fetch when window regains focus — picks up admin's approve/reject without a page reload
  useEffect(() => {
    const onFocus = () => fetchVerificationStatus('manual');
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchVerificationStatus]);

  const handleFileUpload = async (documentType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a valid file (JPEG, PNG, WebP, or PDF)');
      return;
    }

    try {
      setIsUploading(documentType);
      setUploadError('');

      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', documentType);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/driver/verification/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload document';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const config = DOC_TYPES.find((d) => d.type === documentType);
      setUploadSuccess(`${config?.label} uploaded successfully! Awaiting review.`);
      setTimeout(() => setUploadSuccess(''), 3000);

      // Pull fresh status from the server (handles replace, status changes, etc.)
      await fetchVerificationStatus('manual');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(null);
      if (fileInputRefs.current[documentType]) {
        fileInputRefs.current[documentType]!.value = '';
      }
    }
  };

  const triggerFileUpload = (documentType: string) => {
    fileInputRefs.current[documentType]?.click();
  };

  const statusOf = (type: string): DocStatus => {
    const doc = docsByType[type];
    return doc ? (doc.status as DocStatus) : 'pending';
  };

  const getStatusIcon = (status: DocStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'uploaded':
        return <Upload className="w-4 h-4 text-blue-500" />;
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: DocStatus) => {
    switch (status) {
      case 'pending':
        return 'Upload Required';
      case 'uploaded':
        return 'Under Review';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
    }
  };

  const getStatusColor = (status: DocStatus) => {
    switch (status) {
      case 'pending':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'uploaded':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const verifiedCount = DOC_TYPES.filter((d) => statusOf(d.type) === 'verified').length;
  const totalCount = DOC_TYPES.length;
  const verificationProgress = (verifiedCount / totalCount) * 100;
  const allRequiredVerified = DOC_TYPES.filter((d) => d.required).every((d) => statusOf(d.type) === 'verified');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading verification status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Driver Verification</h3>
              <p className="text-sm text-gray-600">
                Upload required documents to verify your driver account
              </p>
            </div>
          </div>
          <Button
            onClick={() => fetchVerificationStatus('manual')}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Verification Progress</span>
            <span className="text-sm text-gray-600">{verifiedCount}/{totalCount} verified</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                allRequiredVerified ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${verificationProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {uploadSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-md">
            {uploadSuccess}
          </div>
        )}

        {uploadError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError('')} className="ml-2 underline text-sm">
              Dismiss
            </button>
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          {DOC_TYPES.map((config) => {
            const doc = docsByType[config.type];
            const status = statusOf(config.type);
            const canUpload = status === 'pending' || status === 'rejected';
            const canReplace = status === 'uploaded' || status === 'verified';

            return (
              <div key={config.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    {config.icon}
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center">
                        {config.label}
                        {config.required && <span className="ml-2 text-red-500 text-sm">*</span>}
                      </h4>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                      <span className="ml-1">{getStatusText(status)}</span>
                    </div>

                    {/* View uploaded file */}
                    {doc?.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 text-xs border rounded hover:bg-gray-50"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </a>
                    )}

                    {canUpload && (
                      <Button
                        onClick={() => triggerFileUpload(config.type)}
                        disabled={isUploading === config.type}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isUploading === config.type ? (
                          <>
                            <Upload className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {status === 'rejected' ? 'Re-upload' : 'Upload'}
                          </>
                        )}
                      </Button>
                    )}

                    {canReplace && (
                      <Button
                        onClick={() => triggerFileUpload(config.type)}
                        disabled={isUploading === config.type}
                        size="sm"
                        variant="outline"
                      >
                        {isUploading === config.type ? 'Uploading...' : 'Replace'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                {status === 'rejected' && doc?.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      <strong>Rejection Reason:</strong> {doc.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Verified timestamp */}
                {status === 'verified' && doc?.reviewed_at && (
                  <div className="mt-2 text-xs text-green-700">
                    Verified on {new Date(doc.reviewed_at).toLocaleDateString()}
                  </div>
                )}

                {/* Upload timestamp */}
                {doc?.uploaded_at && status !== 'verified' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Uploaded {new Date(doc.uploaded_at).toLocaleString()}
                  </div>
                )}

                {canReplace && status === 'verified' && (
                  <p className="mt-2 text-xs text-gray-500">
                    Replacing a verified document will require re-review.
                  </p>
                )}

                <input
                  ref={(el) => { fileInputRefs.current[config.type] = el; }}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={(e) => handleFileUpload(config.type, e)}
                  className="hidden"
                />
              </div>
            );
          })}
        </div>

        {/* Verification Status Summary */}
        {allRequiredVerified ? (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="font-medium text-green-900">You're fully verified!</p>
                <p className="text-sm text-green-700">
                  All required documents have been approved. You can offer rides.
                </p>
              </div>
            </div>
          </div>
        ) : verifiedCount === 0 && Object.keys(docsByType).length === 0 ? null : (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="font-medium text-blue-900">Verification in progress</p>
                <p className="text-sm text-blue-700">
                  {verifiedCount} of {totalCount} documents verified. We'll update this page automatically when your status changes.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
