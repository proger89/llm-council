import { useState, useRef, useCallback, memo } from 'react';
import { Send, Loader2 } from 'lucide-react';

const MessageInput = memo(function MessageInput({ onSendMessage, isLoading, chatId }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const heightRef = useRef(48); // Store height to avoid layout thrashing

  // Reset input when chat changes
  const lastChatIdRef = useRef(chatId);
  if (chatId !== lastChatIdRef.current) {
    lastChatIdRef.current = chatId;
    setInput('');
  }

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim());
    setInput('');
    // Reset height
    if (inputRef.current) {
      inputRef.current.style.height = '48px';
    }
    heightRef.current = 48;
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  // Throttled height adjustment - only recalculate when needed
  const handleInput = useCallback((e) => {
    const el = e.target;
    // Only resize if content changed significantly (new line or major change)
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 128);
    if (Math.abs(newHeight - heightRef.current) > 4) {
      heightRef.current = newHeight;
      el.style.height = newHeight + 'px';
    } else {
      el.style.height = heightRef.current + 'px';
    }
  }, []);

  return (
    <div className="border-t border-council-border bg-council-bg p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-council-sidebar rounded-2xl border border-council-border focus-within:border-council-accent/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Задайте вопрос совету..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 resize-none outline-none text-council-text placeholder-council-text-secondary max-h-32 overflow-y-auto"
            style={{ 
              minHeight: '48px',
              height: heightRef.current + 'px',
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
  );
});

export default MessageInput;

