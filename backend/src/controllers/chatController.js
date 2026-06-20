const supabase = require('../config/supabase');

const chatController = {
  // Get all conversations for a user
  async getUserConversations(req, res) {
    try {
      console.log('=== GET USER CONVERSATIONS ===');
      const userId = req.user.id;
      
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          driver:user_profiles!conversations_driver_id_fkey(id, name, avatar_url),
          passenger:user_profiles!conversations_passenger_id_fkey(id, name, avatar_url),
          ride:rides(id, origin, destination, departure_time, price_per_seat),
          last_message:messages(message_text, created_at, sender_id, message_type)
        `)
        .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return res.status(500).json({ message: 'Failed to fetch conversations' });
      }

      // Format conversations with last message
      const formattedConversations = conversations.map(conv => {
        const isDriver = conv.driver_id === userId;
        const otherUser = isDriver ? conv.passenger : conv.driver;
        
        return {
          id: conv.id,
          ride_id: conv.ride_id,
          other_user: {
            id: otherUser.id,
            name: otherUser.name,
            avatar_url: otherUser.avatar_url
          },
          ride: conv.ride,
          contact_shared: conv.contact_shared,
          driver_paid: conv.driver_paid,
          passenger_paid: conv.passenger_paid,
          my_payment_status: isDriver ? conv.driver_paid : conv.passenger_paid,
          other_payment_status: isDriver ? conv.passenger_paid : conv.driver_paid,
          is_current_user_driver: isDriver,
          contact_info: conv.contact_shared ? {
            my_info: isDriver ? conv.driver_contact_info : conv.passenger_contact_info,
            other_info: isDriver ? conv.passenger_contact_info : conv.driver_contact_info
          } : null,
          last_message: conv.last_message ? {
            text: conv.last_message.message_text,
            created_at: conv.last_message.created_at,
            is_mine: conv.last_message.sender_id === userId,
            type: conv.last_message.message_type
          } : null,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message_at: conv.last_message_at
        };
      });

      res.json(formattedConversations);
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get or create a conversation
  async getOrCreateConversation(req, res) {
    try {
      console.log('=== GET OR CREATE CONVERSATION ===');
      const { ride_id } = req.params;
      const userId = req.user.id;

      // Get ride details
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', ride_id)
        .single();

      if (rideError || !ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      // Check if user is either driver or can request the ride
      const isDriver = ride.driver_id === userId;
      if (isDriver) {
        return res.status(400).json({ message: 'Drivers cannot chat with themselves' });
      }

      // Look for existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('ride_id', ride_id)
        .eq('passenger_id', userId)
        .single();

      if (existingConv) {
        return res.json({ conversation_id: existingConv.id });
      }

      // Create new conversation with driver already marked as paid
      // (since they paid to post the ride)
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert([{
          ride_id: ride_id,
          driver_id: ride.driver_id,
          passenger_id: userId,
          driver_paid: true,  // Driver already paid for ride posting
          passenger_paid: false  // Passenger still needs to pay for contact sharing
        }])
        .select()
        .single();

      if (convError) {
        console.error('=== CONVERSATION CREATION ERROR ===');
        console.error('Error details:', JSON.stringify(convError, null, 2));
        console.error('Ride ID:', ride_id);
        console.error('Driver ID:', ride.driver_id);
        console.error('Passenger ID:', userId);
        console.error('User from token:', req.user);
        console.error('=====================================');
        
        // More specific error messages
        if (convError.code === '42501') {
          return res.status(403).json({ 
            message: 'Permission denied: Row Level Security policy violation',
            error_code: 'RLS_VIOLATION',
            details: 'Please contact support if this persists'
          });
        }
        
        return res.status(500).json({ 
          message: 'Failed to create conversation',
          error_code: convError.code || 'UNKNOWN',
          error_details: process.env.NODE_ENV === 'development' ? convError.message : undefined
        });
      }

      // Note: No welcome message is sent until passenger pays

      res.status(201).json({ 
        conversation_id: newConv.id,
        message: 'Conversation created successfully'
      });
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Get messages for a conversation
  async getConversationMessages(req, res) {
    try {
      console.log('=== GET CONVERSATION MESSAGES ===');
      const { conversation_id } = req.params;
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Verify user has access to this conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('driver_id, passenger_id, contact_shared, driver_contact_info, passenger_contact_info, driver_paid, passenger_paid')
        .eq('id', conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.driver_id !== userId && conversation.passenger_id !== userId) {
        return res.status(403).json({ message: 'Access denied to this conversation' });
      }

      // Check if passenger has paid before showing messages
      const isDriver = conversation.driver_id === userId;
      if (!isDriver && !conversation.passenger_paid) {
        // Return empty messages for unpaid passengers
        const contactInfo = null;
        return res.json({
          messages: [],
          contact_shared: false,
          contact_info: contactInfo,
          has_more: false,
          payment_required: true
        });
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          message_text,
          message_type,
          sender_id,
          created_at,
          is_read,
          sender:user_profiles(name, avatar_url)
        `)
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return res.status(500).json({ message: 'Failed to fetch messages' });
      }

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversation_id)
        .neq('sender_id', userId)
        .eq('is_read', false);

      // Format messages
      const formattedMessages = messages.reverse().map(msg => ({
        id: msg.id,
        text: msg.message_text,
        type: msg.message_type,
        sender_id: msg.sender_id,
        sender_name: msg.sender.name,
        sender_avatar: msg.sender.avatar_url,
        is_mine: msg.sender_id === userId,
        created_at: msg.created_at,
        is_read: msg.is_read
      }));

      // Include contact info if shared
      // isDriver already declared above
      const contactInfo = conversation.contact_shared ? {
        my_info: isDriver ? conversation.driver_contact_info : conversation.passenger_contact_info,
        other_info: isDriver ? conversation.passenger_contact_info : conversation.driver_contact_info
      } : null;

      res.json({
        messages: formattedMessages,
        contact_shared: conversation.contact_shared,
        contact_info: contactInfo,
        has_more: messages.length === limit
      });
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Send a message
  async sendMessage(req, res) {
    try {
      console.log('=== SEND MESSAGE ===');
      const { conversation_id } = req.params;
      const { message_text } = req.body;
      const userId = req.user.id;

      if (!message_text || message_text.trim().length === 0) {
        return res.status(400).json({ message: 'Message text is required' });
      }

      if (message_text.length > 1000) {
        return res.status(400).json({ message: 'Message too long' });
      }

      // Verify user has access to this conversation and check payment status
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('driver_id, passenger_id, driver_paid, passenger_paid')
        .eq('id', conversation_id)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.driver_id !== userId && conversation.passenger_id !== userId) {
        return res.status(403).json({ message: 'Access denied to this conversation' });
      }

      // Check if passenger has paid before allowing messages
      const isDriver = conversation.driver_id === userId;
      if (!isDriver && !conversation.passenger_paid) {
        return res.status(403).json({ 
          message: 'Please pay KES 50 to unlock messaging and contact sharing',
          code: 'PAYMENT_REQUIRED'
        });
      }

      // Insert message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation_id,
          sender_id: userId,
          message_text: message_text.trim(),
          message_type: 'text'
        }])
        .select(`
          id,
          message_text,
          message_type,
          sender_id,
          created_at,
          sender:user_profiles(name, avatar_url)
        `)
        .single();

      if (messageError) {
        console.error('Error sending message:', messageError);
        return res.status(500).json({ message: 'Failed to send message' });
      }

      // Format response
      const formattedMessage = {
        id: message.id,
        text: message.message_text,
        type: message.message_type,
        sender_id: message.sender_id,
        sender_name: message.sender.name,
        sender_avatar: message.sender.avatar_url,
        is_mine: true,
        created_at: message.created_at,
        is_read: false
      };

      // Emit real-time updates via Socket.IO
      const io = req.app.get('io');
      if (io) {
        const socketMessage = { ...formattedMessage, conversation_id: conversation_id };
        
        // Emit to conversation room
        io.to(`conversation_${conversation_id}`).emit('new_message', socketMessage);
        
        // Send notification to other user
        const otherUserId = isDriver ? conversation.passenger_id : conversation.driver_id;
        io.to(`user_${otherUserId}`).emit('new_message_notification', {
          conversation_id: conversation_id,
          sender_name: message.sender.name,
          message_text: message.message_text.trim()
        });
      }

      res.status(201).json(formattedMessage);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // payForContactSharing removed — Paystack is now the single payment provider.
  // Passengers pay via POST /api/paystack/initiate (purpose: 'connection_fee'),
  // which sets conversations.passenger_paid = true on success.

  // Get payment status for a conversation
  async getPaymentStatus(req, res) {
    try {
      const { conversation_id } = req.params;
      const userId = req.user.id;

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('driver_id, passenger_id, driver_paid, passenger_paid, contact_shared')
        .eq('id', conversation_id)
        .single();

      if (error || !conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      if (conversation.driver_id !== userId && conversation.passenger_id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const isDriver = conversation.driver_id === userId;

      res.json({
        my_payment_status: isDriver ? conversation.driver_paid : conversation.passenger_paid,
        other_payment_status: isDriver ? conversation.passenger_paid : conversation.driver_paid,
        both_paid: conversation.driver_paid && conversation.passenger_paid,
        contact_shared: conversation.contact_shared
      });
    } catch (error) {
      console.error('Error in getPaymentStatus:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

module.exports = chatController;