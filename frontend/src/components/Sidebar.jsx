import { useState, memo, useMemo, useCallback } from 'react';
import { MessageSquarePlus, Trash2, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

const Sidebar = memo(function Sidebar({ 
  chats, 
  currentChatId, 
  isOpen, 
  onToggle, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat 
}) {
  const [hoveredChat, setHoveredChat] = useState(null);

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  }, []);

  // Group chats by date - memoized
  const groupedChats = useMemo(() => {
    return chats.reduce((groups, chat) => {
      const dateLabel = formatDate(chat.updated_at);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(chat);
      return groups;
    }, {});
  }, [chats, formatDate]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'w-64' : 'w-0'
        } bg-council-sidebar flex flex-col transition-all duration-300 overflow-hidden border-r border-council-border`}
      >
        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-council-border">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-council-hover hover:bg-council-border transition-colors text-sm font-medium flex-1"
          >
            <MessageSquarePlus size={18} />
            Новый чат
          </button>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-council-hover transition-colors ml-2"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto py-2">
          {Object.entries(groupedChats).map(([dateLabel, groupChats]) => (
            <div key={dateLabel} className="mb-4">
              <div className="px-3 py-1 text-xs text-council-text-secondary font-medium">
                {dateLabel}
              </div>
              {groupChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative mx-2 mb-1 rounded-lg cursor-pointer transition-colors ${
                    chat.id === currentChatId
                      ? 'bg-council-hover'
                      : 'hover:bg-council-hover/50'
                  }`}
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => setHoveredChat(null)}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <MessageCircle size={16} className="text-council-text-secondary flex-shrink-0" />
                    <span className="text-sm truncate flex-1">
                      {chat.title || 'Новый чат'}
                    </span>
                    {hoveredChat === chat.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-council-text-secondary hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {chats.length === 0 && (
            <div className="px-4 py-8 text-center text-council-text-secondary text-sm">
              Пока нет чатов. Начните новый разговор!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-council-border">
          <div className="text-xs text-council-text-secondary text-center">
            <span className="gradient-text font-semibold">Совет ИИ</span>
            <br />
            <span>2 модели • 1 решение</span>
          </div>
        </div>
      </aside>

      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-1/2 -translate-y-1/2 p-2 bg-council-sidebar rounded-r-lg border border-l-0 border-council-border hover:bg-council-hover transition-colors z-10"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </>
  );
});

export default Sidebar;
