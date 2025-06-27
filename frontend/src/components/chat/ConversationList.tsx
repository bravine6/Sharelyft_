import { useEffect } from 'react';
import { useChat, Conversation } from '@/hooks/useChat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock, MapPin, DollarSign, User, CheckCircle, XCircle } from 'lucide-react';

interface ConversationListProps {
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  onStartNewChat?: () => void;
}

export const ConversationList = ({ 
  selectedConversationId, 
  onSelectConversation, 
  onStartNewChat 
}: ConversationListProps) => {
  const { conversations, loading, error, fetchConversations } = useChat();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPaymentStatusIcon = (conversation: Conversation) => {
    if (conversation.contact_shared) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (conversation.my_payment_status && conversation.other_payment_status) {
      return <CheckCircle className="w-4 h-4 text-blue-600" />;
    } else if (conversation.my_payment_status) {
      return <Clock className="w-4 h-4 text-yellow-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPaymentStatusText = (conversation: Conversation) => {
    if (conversation.contact_shared) {
      return 'Contacts shared';
    } else if (conversation.my_payment_status && conversation.other_payment_status) {
      return 'Both paid - sharing contacts...';
    } else if (conversation.is_current_user_driver) {
      // Driver-specific messages
      if (conversation.other_payment_status) {
        return 'Passenger paid - sharing contacts...';
      } else {
        return 'Waiting for passenger payment';
      }
    } else {
      // Passenger-specific messages
      if (conversation.my_payment_status) {
        return 'Waiting for contact sharing';
      } else {
        return 'Pay KES 50 to share contacts';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
          <Button 
            onClick={fetchConversations} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </h2>
          {onStartNewChat && (
            <Button onClick={onStartNewChat} size="sm">
              New Chat
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Start chatting with drivers or passengers
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedConversationId === conversation.id
                    ? 'ring-2 ring-green-500 bg-green-50'
                    : ''
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
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
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {conversation.other_user.name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {conversation.last_message_at && formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-2 text-xs text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">
                          {conversation.ride.origin} → {conversation.ride.destination}
                        </span>
                      </div>
                      
                      {conversation.last_message && (
                        <p className="text-sm text-gray-600 truncate mb-2">
                          {conversation.last_message.is_mine ? 'You: ' : ''}
                          {conversation.last_message.text}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-xs">KES {conversation.ride.price_per_seat}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {getPaymentStatusIcon(conversation)}
                          <span className="text-xs text-gray-500">
                            {getPaymentStatusText(conversation)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};