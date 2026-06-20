import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Building2,
  Plus,
  Trash2,
  Star,
  Check,
  AlertCircle
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  name: string;
  details: string;
  isDefault: boolean;
  isVerified: boolean;
  lastUsed?: string;
}

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      name: 'Visa Card',
      details: '**** **** **** 1234',
      isDefault: true,
      isVerified: true,
      lastUsed: '2024-01-10'
    }
  ]);

  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<'card' | 'bank'>('card');
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form data for adding new payment methods
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  
  const [bankData, setBankData] = useState({
    accountNumber: '',
    bankName: '',
    accountName: ''
  });

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev => 
      prev.map(method => ({
        ...method,
        isDefault: method.id === id
      }))
    );
    setSuccess('Default payment method updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteMethod = (id: string) => {
    const methodToDelete = paymentMethods.find(m => m.id === id);
    if (methodToDelete?.isDefault) {
      setError('Cannot delete the default payment method. Set another method as default first.');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    setPaymentMethods(prev => prev.filter(method => method.id !== id));
    setSuccess('Payment method removed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddMethod = async () => {
    setIsAddingMethod(true);
    setError('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let newMethod: PaymentMethod;
      const newId = (paymentMethods.length + 1).toString();
      
      if (selectedMethodType === 'card') {
        newMethod = {
          id: newId,
          type: 'card',
          name: 'Credit Card',
          details: `**** **** **** ${cardData.cardNumber.slice(-4)}`,
          isDefault: paymentMethods.length === 0,
          isVerified: false
        };
        setCardData({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
      } else {
        newMethod = {
          id: newId,
          type: 'bank',
          name: bankData.bankName,
          details: `Account ending in ${bankData.accountNumber.slice(-4)}`,
          isDefault: paymentMethods.length === 0,
          isVerified: false
        };
        setBankData({ accountNumber: '', bankName: '', accountName: '' });
      }
      
      setPaymentMethods(prev => [...prev, newMethod]);
      setShowAddMethod(false);
      setSuccess('Payment method added successfully! Verification required.');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      setError('Failed to add payment method. Please try again.');
    } finally {
      setIsAddingMethod(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="w-6 h-6" />;
      case 'bank':
        return <Building2 className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const formatLastUsed = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-gray-600">Manage your payment methods for rides and services</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 p-4 rounded-md">
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              {success}
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Payment Methods List */}
        <div className="space-y-4 mb-8">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={`${method.isDefault ? 'ring-2 ring-green-500' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${
                      method.type === 'card' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {getMethodIcon(method.type)}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{method.name}</h3>
                        {method.isDefault && (
                          <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </div>
                        )}
                        <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                          method.isVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {method.isVerified ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600">{method.details}</p>
                      {method.lastUsed && (
                        <p className="text-sm text-gray-500">Last used: {formatLastUsed(method.lastUsed)}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    {!method.isVerified && (
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleDeleteMethod(method.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Payment Method */}
        {!showAddMethod ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="p-6">
              <div className="text-center">
                <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Add Payment Method</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add a new payment method to make transactions easier
                </p>
                <Button onClick={() => setShowAddMethod(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Method
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New Payment Method</h3>
              
              {/* Payment Method Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Payment Method Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { type: 'card' as const, name: 'Credit/Debit Card', icon: CreditCard, color: 'blue' },
                    { type: 'bank' as const, name: 'Bank Account', icon: Building2, color: 'purple' }
                  ].map(({ type, name, icon: Icon, color }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedMethodType(type)}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                        selectedMethodType === type 
                          ? (color === 'green' ? 'border-green-500 bg-green-50' : 
                             color === 'blue' ? 'border-blue-500 bg-blue-50' : 
                             'border-purple-500 bg-purple-50')
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-8 h-8 ${
                        selectedMethodType === type 
                          ? (color === 'green' ? 'text-green-600' : 
                             color === 'blue' ? 'text-blue-600' : 
                             'text-purple-600')
                          : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        selectedMethodType === type 
                          ? (color === 'green' ? 'text-green-900' : 
                             color === 'blue' ? 'text-blue-900' : 
                             'text-purple-900')
                          : 'text-gray-700'
                      }`}>
                        {name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 mb-6">
                {selectedMethodType === 'card' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardData.cardNumber}
                        onChange={(e) => setCardData(prev => ({ ...prev, cardNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          value={cardData.expiryDate}
                          onChange={(e) => setCardData(prev => ({ ...prev, expiryDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={cardData.cvv}
                          onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={cardData.cardholderName}
                        onChange={(e) => setCardData(prev => ({ ...prev, cardholderName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                      />
                    </div>
                  </>
                )}

                {selectedMethodType === 'bank' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <select
                        value={bankData.bankName}
                        onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select Bank</option>
                        <option value="KCB Bank">KCB Bank</option>
                        <option value="Equity Bank">Equity Bank</option>
                        <option value="Cooperative Bank">Cooperative Bank</option>
                        <option value="NCBA Bank">NCBA Bank</option>
                        <option value="Standard Chartered">Standard Chartered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={bankData.accountNumber}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={bankData.accountName}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Account holder name"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddMethod}
                  disabled={isAddingMethod}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isAddingMethod ? 'Adding...' : 'Add Payment Method'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddMethod(false);
                    setCardData({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
                    setBankData({ accountNumber: '', bankName: '', accountName: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}