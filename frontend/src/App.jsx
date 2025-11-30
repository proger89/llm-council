import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import WelcomeScreen from './components/WelcomeScreen';
import { listChats, createChat, getChat, deleteChat, sendMessageStream } from './api';

function App() {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [discussionState, setDiscussionState] = useState(null);
  
  // Use ref to access latest discussion state in callbacks
  const discussionStateRef = useRef(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    discussionStateRef.current = discussionState;
  }, [discussionState]);
  
  // Memoize toggle sidebar callback
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const data = await listChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    // Create temporary chat (not saved to DB yet)
    const tempChat = {
      id: `temp-${Date.now()}`,
      title: 'Новый чат',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isTemporary: true,
    };
    setCurrentChat(tempChat);
    setMessages([]);
    setDiscussionState(null);
  }, []);

  const handleSelectChat = useCallback(async (chatId) => {
    try {
      const chatData = await getChat(chatId);
      setCurrentChat(chatData);
      setMessages(chatData.messages || []);
      setDiscussionState(null);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  }, []);

  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }, [currentChat?.id]);

  const handleSendMessage = useCallback(async (content, isRetry = false) => {
    if (!currentChat || isLoading) return;

    setIsLoading(true);
    
    // Add user message immediately (skip if retry)
    if (!isRetry) {
      const userMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
    }

    // If chat is temporary, create it in DB first
    let chatToUse = currentChat;
    if (currentChat.isTemporary) {
      try {
        const newChat = await createChat();
        chatToUse = newChat;
        setCurrentChat(newChat);
        setChats(prev => [newChat, ...prev]);
      } catch (error) {
        console.error('Failed to create chat:', error);
        setIsLoading(false);
        return;
      }
    }

    // Reset discussion state for new message
    const initialState = {
      stage: 'initial',
      progress: [],
      initialResponses: null,
      discussionRounds: [],
      consensus: null,
    };
    setDiscussionState(initialState);
    discussionStateRef.current = initialState;

    // Variables to collect data during streaming
    let collectedData = {
      initialResponses: null,
      discussionRounds: [],
      consensus: null,
    };

    // Send message with streaming
    sendMessageStream(chatToUse.id, content, {
      onProgress: (progress) => {
        setDiscussionState(prev => {
          const newState = {
            ...prev,
            stage: progress.stage,
            progress: [...(prev?.progress || []), progress],
          };
          discussionStateRef.current = newState;
          return newState;
        });
      },
      onInitialResponses: (responses) => {
        collectedData.initialResponses = responses;
        setDiscussionState(prev => {
          const newState = {
            ...prev,
            stage: 'discussion',
            initialResponses: responses,
          };
          discussionStateRef.current = newState;
          return newState;
        });
      },
      onDiscussionRound: (round) => {
        collectedData.discussionRounds.push(round);
        setDiscussionState(prev => {
          const newState = {
            ...prev,
            discussionRounds: [...(prev?.discussionRounds || []), round],
          };
          discussionStateRef.current = newState;
          return newState;
        });
      },
      onConsensus: (consensus) => {
        collectedData.consensus = consensus;
        setDiscussionState(prev => {
          const newState = {
            ...prev,
            stage: 'consensus',
            consensus,
          };
          discussionStateRef.current = newState;
          return newState;
        });
      },
      onError: (error) => {
        console.error('Stream error:', error);
        setIsLoading(false);
        // Show error message
        setMessages(prev => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `**Ошибка:** ${error.message || 'Не удалось получить ответ от совета. Проверьте API ключ OpenRouter.'}`,
            created_at: new Date().toISOString(),
          },
        ]);
      },
      onDone: (data) => {
        // Use collected data instead of stale closure
        const finalConsensus = collectedData.consensus || discussionStateRef.current?.consensus;
        const finalAnswer = finalConsensus?.final_answer || 'Ответ не получен';
        
        // Add assistant message
        setMessages(prev => [
          ...prev,
          {
            id: data.message_id || `msg-${Date.now()}`,
            role: 'assistant',
            content: finalAnswer,
            created_at: new Date().toISOString(),
            discussion_data: {
              initial_responses: collectedData.initialResponses,
              discussion_rounds: collectedData.discussionRounds,
              consensus: collectedData.consensus,
            },
          },
        ]);
        
        // Update chat in sidebar
        setChats(prev => {
          const updated = prev.map(c => 
            c.id === chatToUse.id 
              ? { ...c, updated_at: new Date().toISOString() }
              : c
          );
          return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        });

        // Reload chat to get saved messages
        loadChats();

        setIsLoading(false);
      },
    });
  }, [currentChat, isLoading, loadChats]);

  const handleRetry = useCallback(() => {
    if (isLoading || messages.length < 1) return;

    // Find the last user message
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const lastUserContent = messages[lastUserMessageIndex].content;

    // Remove only the last assistant message (keep user message)
    setMessages(prev => {
      // Find and remove the last assistant message
      const lastAssistantIndex = prev.map(m => m.role).lastIndexOf('assistant');
      if (lastAssistantIndex !== -1) {
        return [...prev.slice(0, lastAssistantIndex), ...prev.slice(lastAssistantIndex + 1)];
      }
      return prev;
    });

    // Re-send the message (with isRetry=true to skip adding user message)
    handleSendMessage(lastUserContent, true);
  }, [messages, isLoading, handleSendMessage]);

  // Memoize filtered chats to avoid recalculation
  const filteredChats = useMemo(() => 
    chats.filter(c => !c.isTemporary), 
    [chats]
  );

  return (
    <div className="flex h-screen bg-council-bg">
      {/* Sidebar */}
      <Sidebar
        chats={filteredChats}
        currentChatId={currentChat?.id}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentChat ? (
          <ChatView
            chat={currentChat}
            messages={messages}
            discussionState={discussionState}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onRetry={handleRetry}
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        ) : (
          <WelcomeScreen 
            onNewChat={handleNewChat}
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        )}
      </main>
    </div>
  );
}

export default App;
