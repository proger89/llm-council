import { memo, useState, useCallback } from 'react';
import { User, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Memoized markdown components to avoid recreation on each render
const markdownComponents = {
  // Code blocks
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-council-surface px-1.5 py-0.5 rounded text-sm font-mono text-council-accent" {...props}>
        {children}
      </code>
    );
  },
  // Tables
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-council-border rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-council-surface">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="border border-council-border px-4 py-2 text-left font-semibold text-council-text">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-council-border px-4 py-2 text-council-text-secondary">
        {children}
      </td>
    );
  },
  tr({ children }) {
    return <tr className="hover:bg-council-surface/50 transition-colors">{children}</tr>;
  },
  // Headings
  h1({ children }) {
    return <h1 className="text-2xl font-bold mt-6 mb-4 text-council-text">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-xl font-bold mt-5 mb-3 text-council-text">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-lg font-semibold mt-4 mb-2 text-council-text">{children}</h3>;
  },
  // Lists
  ul({ children }) {
    return <ul className="list-disc list-inside my-2 space-y-1 text-council-text-secondary">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside my-2 space-y-1 text-council-text-secondary">{children}</ol>;
  },
  li({ children }) {
    return <li className="ml-2">{children}</li>;
  },
  // Paragraphs
  p({ children }) {
    return <p className="my-2 text-council-text-secondary leading-relaxed">{children}</p>;
  },
  // Blockquotes
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-council-accent pl-4 my-4 italic text-council-text-secondary">
        {children}
      </blockquote>
    );
  },
  // Strong & emphasis
  strong({ children }) {
    return <strong className="font-bold text-council-text">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  // Links
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" 
         className="text-council-accent hover:underline">
        {children}
      </a>
    );
  },
  // Horizontal rule
  hr() {
    return <hr className="my-4 border-council-border" />;
  },
};

const MessageBubble = memo(function MessageBubble({ message, isExpanded, onToggleExpand }) {
  const isUser = message.role === 'user';
  const hasDiscussion = message.role === 'assistant' && message.discussion_data;
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [message.content]);

  return (
    <div className={`mb-6 ${isUser ? 'flex justify-end' : ''}`}>
      <div className={`flex gap-3 max-w-full ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-council-accent' 
            : 'bg-gradient-to-br from-council-gpt via-council-gemini to-council-claude'
        }`}>
          {isUser ? (
            <User size={16} className="text-white" />
          ) : (
            <div className="flex -space-x-1">
              <div className="w-2 h-2 rounded-full bg-white/80" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${isUser ? 'text-right' : ''}`}>
          {/* Header */}
          <div className={`flex items-center gap-2 mb-1 text-sm ${isUser ? 'justify-end' : ''}`}>
            <span className="font-medium">
              {isUser ? 'Вы' : 'Совет'}
            </span>
            <span className="text-council-text-secondary text-xs">
              {new Date(message.created_at).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>

          {/* Message content */}
          <div className={`${
            isUser 
              ? 'bg-council-accent/20 rounded-2xl rounded-tr-sm px-4 py-2 inline-block text-left'
              : ''
          }`}>
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Action buttons */}
          <div className={`flex items-center gap-2 mt-2 ${isUser ? 'justify-end' : ''}`}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-council-text-secondary hover:text-council-accent transition-colors px-2 py-1 rounded hover:bg-council-hover"
              title="Копировать"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-green-500" />
                  <span className="text-green-500">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Копировать</span>
                </>
              )}
            </button>

            {/* Discussion toggle */}
            {hasDiscussion && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 text-xs text-council-accent hover:text-council-accent/80 transition-colors px-2 py-1 rounded hover:bg-council-hover"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>
                  {isExpanded ? 'Скрыть' : 'Показать'} обсуждение
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
