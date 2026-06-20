import { useState, useEffect, useRef } from 'react';
import { useChat, Conversation } from '@/hooks/useChat';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  User, 
  MapPin, 
  Clock, 
  DollarSign, 
  Phone, 
  Mail, 
  CreditCard,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ChatWindowProps {
  conversation: Conversation;
}

export const ChatWindow = ({ conversation }: ChatWindowProps) => {
  const {
    messages,
    sendMessage,
    fetchMessages,
    joinConversation,
    leaveConversation,
    error
  } = useChat();
  
  // Get user role from conversation data
  const isCurrentUserDriver = conversation.is_current_user_driver;
  
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationMessages = messages[conversation.id] || [];

  // Join conversation and fetch messages
  useEffect(() => {
    joinConversation(conversation.id);
    fetchMessages(conversation.id);

    return () => {
      leaveConversation(conversation.id);
    };
  }, [conversation.id, joinConversation, leaveConversation, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      await sendMessage(conversation.id, messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handlePayWithPaystack = async () => {
    try {
      setPaying(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/paystack/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purpose: 'connection_fee',
          amount: 50,
          conversation_id: conversation.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.authorization_url) {
        throw new Error(data.message || 'Failed to initiate Paystack payment');
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error('Paystack payment failed:', err);
      setPaying(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderContactInfo = () => {
    if (!conversation.contact_shared || !conversation.contact_info) {
      return null;
    }

    const { other_info } = conversation.contact_info;

    return (
      <div className="mb-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-green-800">Contact Information Shared</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                <span className="font-medium">{other_info.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-600" />
                <span>{other_info.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-600" />
                <span>{other_info.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPaymentPrompt = () => {
    if (conversation.contact_shared) return null;

    const needsPayment = !conversation.my_payment_status;
    const waitingForOther = conversation.my_payment_status && !conversation.other_payment_status;
    const bothPaid = conversation.my_payment_status && conversation.other_payment_status;

    if (bothPaid) {
      return (
        <div className="mb-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">Both parties have paid. Sharing contacts...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (waitingForOther) {
      return (
        <div className="mb-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800">
                  Waiting for {conversation.other_user.name} to pay for contact sharing
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (needsPayment) {
      if (isCurrentUserDriver) {
        // Driver message - no payment needed
        return (
          <div className="mb-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-green-800 font-medium">Contact Sharing Included</p>
                    <p className="text-green-700 text-sm">
                      As the driver, contact sharing is included with your ride posting. 
                      Waiting for {conversation.other_user.name} to pay KES 50.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      } else {
        // Passenger message - needs to pay
        return (
          <div className="mb-4">
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-orange-800 font-medium">Share Contact Information</p>
                      <p className="text-orange-700 text-sm">
                        Pay KES 50 to share contacts with {conversation.other_user.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowPaymentPrompt(true)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay KES 50
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            {conversation.other_user.avatar_url ? (
              <img
                src={conversation.other_user.avatar_url}
                alt={conversation.other_user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-gray-500" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium">{conversation.other_user.name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="w-3 h-3" />
              <span className="truncate">
                {conversation.ride.origin} → {conversation.ride.destination}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <DollarSign className="w-3 h-3" />
              <span>KES {conversation.ride.price_per_seat}</span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(conversation.ride.departure_time).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderContactInfo()}
        {renderPaymentPrompt()}
        
        {conversationMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          conversationMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.is_mine
                    ? 'bg-green-600 text-white'
                    : message.type === 'system'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className={`text-sm ${message.type === 'system' ? 'text-center font-medium' : ''}`}>
                  {message.text}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    message.is_mine
                      ? 'text-green-100'
                      : message.type === 'system'
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {/* Show payment prompt for passengers who haven't paid */}
        {!isCurrentUserDriver && !conversation.my_payment_status ? (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-orange-800 text-sm font-medium">Payment Required</p>
            <p className="text-orange-700 text-xs mt-1">
              Pay KES 50 above to unlock messaging and contact sharing
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={sending}
            />
            <Button
              type="submit"
              disabled={!messageText.trim() || sending}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h3 className="font-semibold">Share Contact Information</h3>
              <p className="text-sm text-gray-600">
                Pay KES 50 to share your contact information with {conversation.other_user.name}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  onClick={handlePayWithPaystack}
                  disabled={paying}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {paying ? 'Processing...' : 'Pay KES 50 via Paystack'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Pay by card or M-Pesa via Paystack's secure checkout.
                </p>
                <Button
                  onClick={() => setShowPaymentPrompt(false)}
                  variant="outline"
                  className="w-full"
                  disabled={paying}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};