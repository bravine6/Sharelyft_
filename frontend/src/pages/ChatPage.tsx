import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Conversation } from '@/hooks/useChat';
import { MessageCircle } from 'lucide-react';

export const ChatPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <DashboardLayout>
      <div className="h-full flex">
        {/* Sidebar - Conversation List */}
        <div className="w-1/3 border-r border-gray-200 bg-white">
          <ConversationList
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={setSelectedConversation}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-gray-50">
          {selectedConversation ? (
            <ChatWindow conversation={selectedConversation} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-sm">
                  Choose a conversation from the sidebar to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};