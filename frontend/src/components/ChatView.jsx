import { useState, useRef, useEffect } from 'react';
import { Menu, Send, Loader2, RotateCcw } from 'lucide-react';
import MessageBubble from './MessageBubble';
import DiscussionPanel from './DiscussionPanel';
import ProgressIndicator from './ProgressIndicator';

function ChatView({ 
  chat, 
  messages, 
  discussionState, 
  isLoading, 
  onSendMessage, 
  onRetry,
  onToggleSidebar,
  isSidebarOpen 
}) {
  const [input, setInput] = useState('');
  const [expandedMessage, setExpandedMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, discussionState]);

  // Focus input on chat change
  useEffect(() => {
    inputRef.current?.focus();
  }, [chat?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

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
                onToggleExpand={() => 
                  setExpandedMessage(expandedMessage === message.id ? null : message.id)
                }
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

      {/* Input area */}
      <div className="border-t border-council-border bg-council-bg p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 bg-council-sidebar rounded-2xl border border-council-border focus-within:border-council-accent/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Задайте вопрос совету..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent px-4 py-3 resize-none outline-none text-council-text placeholder-council-text-secondary max-h-32 overflow-y-auto"
              style={{ 
                minHeight: '48px',
                height: 'auto',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`m-2 p-2 rounded-lg transition-colors ${
                input.trim() && !isLoading
                  ? 'bg-council-accent text-white hover:bg-council-accent/80'
                  : 'bg-council-hover text-council-text-secondary cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          <p className="text-xs text-council-text-secondary text-center mt-2">
            Совет обсуждает ваш вопрос и приходит к консенсусу
          </p>
        </form>
      </div>
    </div>
  );
}

export default ChatView;
