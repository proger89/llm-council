import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Menu, RotateCcw } from 'lucide-react';
import MessageBubble from './MessageBubble';
import DiscussionPanel from './DiscussionPanel';
import ProgressIndicator from './ProgressIndicator';
import MessageInput from './MessageInput';

const ChatView = memo(function ChatView({ 
  chat, 
  messages, 
  discussionState, 
  isLoading, 
  onSendMessage, 
  onRetry,
  onToggleSidebar,
  isSidebarOpen 
}) {
  const [expandedMessage, setExpandedMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, discussionState]);

  // Memoized callback for toggling expanded message
  const handleToggleExpand = useCallback((messageId) => {
    setExpandedMessage(prev => prev === messageId ? null : messageId);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-council-border bg-council-bg/80 backdrop-blur-sm">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-council-hover transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            <div className="w-3 h-3 rounded-full bg-council-gpt border-2 border-council-bg" />
            <div className="w-3 h-3 rounded-full bg-council-gemini border-2 border-council-bg" />
            <div className="w-3 h-3 rounded-full bg-council-claude border-2 border-council-bg" />
          </div>
          <h1 className="font-medium truncate">{chat?.title || 'Новый чат'}</h1>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.map((message) => (
            <div key={message.id} className="animate-fade-in">
              <MessageBubble
                message={message}
                isExpanded={expandedMessage === message.id}
                onToggleExpand={() => handleToggleExpand(message.id)}
              />
              
              {/* Show discussion panel for expanded assistant messages */}
              {message.role === 'assistant' && 
               expandedMessage === message.id && 
               message.discussion_data && (
                <DiscussionPanel discussionData={message.discussion_data} />
              )}
            </div>
          ))}

          {/* Retry button - show if there's at least one assistant message and not loading */}
          {!isLoading && onRetry && messages.some(m => m.role === 'assistant') && (
            <div className="flex justify-start ml-11 mb-4">
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-council-text-secondary hover:text-council-accent bg-council-surface hover:bg-council-hover rounded-lg transition-colors border border-council-border"
                title="Повторить запрос"
              >
                <RotateCcw size={14} />
                <span>Повторить</span>
              </button>
            </div>
          )}

          {/* Loading state with progress */}
          {isLoading && discussionState && (
            <div className="mt-6 animate-slide-up">
              <ProgressIndicator discussionState={discussionState} />
              
              {/* Show current discussion if available */}
              {(discussionState.initialResponses || discussionState.discussionRounds.length > 0) && (
                <DiscussionPanel 
                  discussionData={{
                    initial_responses: discussionState.initialResponses,
                    discussion_rounds: discussionState.discussionRounds,
                    consensus: discussionState.consensus,
                  }}
                  isLive={true}
                />
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - isolated component to prevent re-renders */}
      <MessageInput 
        onSendMessage={onSendMessage} 
        isLoading={isLoading}
        chatId={chat?.id}
      />
    </div>
  );
});

export default ChatView;
