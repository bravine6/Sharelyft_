import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from './useSocket';
import { API_URL } from '@/config';

export interface Message {
  id: string;
  text: string;
  type: 'text' | 'system' | 'contact_share';
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  is_mine: boolean;
  created_at: string;
  is_read: boolean;
}

export interface Conversation {
  id: string;
  ride_id: string;
  other_user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  ride: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    price_per_seat: number;
  };
  contact_shared: boolean;
  driver_paid: boolean;
  passenger_paid: boolean;
  my_payment_status: boolean;
  other_payment_status: boolean;
  is_current_user_driver: boolean;
  contact_info?: {
    my_info: any;
    other_info: any;
  };
  last_message?: {
    text: string;
    created_at: string;
    is_mine: boolean;
    type: string;
  };
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface PaymentStatus {
  my_payment_status: boolean;
  other_payment_status: boolean;
  both_paid: boolean;
  contact_shared: boolean;
}

export const useChat = () => {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        setError('Failed to fetch conversations');
      }
    } catch (err) {
      setError('Network error while fetching conversations');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => ({
          ...prev,
          [conversationId]: data.messages
        }));
      } else {
        setError('Failed to fetch messages');
      }
    } catch (err) {
      setError('Network error while fetching messages');
    }
  }, [token]);

  // Send a message via HTTP API
  const sendMessage = useCallback(async (conversationId: string, messageText: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message_text: messageText })
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), newMessage]
        }));
        
        // Note: Socket.IO real-time updates are handled by the backend
        // No need to emit here as it would cause duplicates
        
        return newMessage;
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
      throw err;
    }
  }, [token, socket]);

  // Create or get conversation for a ride
  const createConversation = useCallback(async (rideId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/chat/conversations/ride/${rideId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        await fetchConversations(); // Refresh conversations list
        return data.conversation_id;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
      throw err;
    }
  }, [token, fetchConversations]);

  // Pay for contact sharing
  const payForContactSharing = useCallback(async (conversationId: string, paymentMethod: string = 'mpesa') => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ payment_method: paymentMethod })
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh conversations to update payment status
        await fetchConversations();
        return data;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      throw err;
    }
  }, [token, fetchConversations]);

  // Get payment status
  const getPaymentStatus = useCallback(async (conversationId: string): Promise<PaymentStatus | null> => {
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/payment/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error('Failed to get payment status:', err);
    }
    return null;
  }, [token]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message & { conversation_id?: string }) => {
      setMessages(prev => {
        // Find the conversation ID either from the message or by searching existing messages
        const conversationId = message.conversation_id || Object.keys(prev).find(id => 
          prev[id].some(m => m.id === message.id)
        );
        
        if (conversationId) {
          // Check if message already exists to prevent duplicates
          const existingMessages = prev[conversationId] || [];
          const messageExists = existingMessages.some(m => m.id === message.id);
          
          if (!messageExists) {
            return {
              ...prev,
              [conversationId]: [...existingMessages, message]
            };
          }
        }
        return prev;
      });
    };

    const handleNewMessageNotification = (notification: any) => {
      // Handle notification (could show toast, update conversation list, etc.)
      console.log('New message notification:', notification);
      fetchConversations(); // Refresh to update last message
    };

    const handleTyping = (data: any) => {
      console.log('User typing:', data);
      // Handle typing indicator
    };

    const handleStopTyping = (data: any) => {
      console.log('User stopped typing:', data);
      // Handle stop typing
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_message_notification', handleNewMessageNotification);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('new_message_notification', handleNewMessageNotification);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, fetchConversations]);

  // Join conversation room
  const joinConversation = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  }, [socket]);

  // Leave conversation room
  const leaveConversation = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  }, [socket]);

  // Send typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('typing_start', conversationId);
    }
  }, [socket]);

  const stopTyping = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('typing_stop', conversationId);
    }
  }, [socket]);

  return {
    conversations,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    payForContactSharing,
    getPaymentStatus,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    clearError: () => setError(null)
  };
};