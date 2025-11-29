/**
 * API client for LLM Council backend.
 */

const API_BASE = '/api';

/**
 * Fetch wrapper with error handling.
 */
async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get available council models.
 */
export async function getModels() {
  return fetchAPI('/models');
}

/**
 * Create a new chat.
 */
export async function createChat(title = null) {
  return fetchAPI('/chats', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

/**
 * List all chats.
 */
export async function listChats(limit = 50, offset = 0) {
  return fetchAPI(`/chats?limit=${limit}&offset=${offset}`);
}

/**
 * Get a single chat with messages.
 */
export async function getChat(chatId) {
  return fetchAPI(`/chats/${chatId}`);
}

/**
 * Delete a chat.
 */
export async function deleteChat(chatId) {
  return fetchAPI(`/chats/${chatId}`, {
    method: 'DELETE',
  });
}

/**
 * Update chat title.
 */
export async function updateChat(chatId, title) {
  return fetchAPI(`/chats/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

/**
 * Send a message and get response (non-streaming).
 */
export async function sendMessage(chatId, content) {
  return fetchAPI(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

/**
 * Send a message with SSE streaming.
 * @param {string} chatId - Chat ID
 * @param {string} content - Message content
 * @param {function} onProgress - Called with progress events
 * @param {function} onInitialResponses - Called with initial responses
 * @param {function} onDiscussionRound - Called with each discussion round
 * @param {function} onConsensus - Called with final consensus
 * @param {function} onError - Called on error
 * @param {function} onDone - Called when complete
 */
export function sendMessageStream(
  chatId,
  content,
  {
    onProgress,
    onInitialResponses,
    onDiscussionRound,
    onConsensus,
    onError,
    onDone,
  }
) {
  const controller = new AbortController();

  fetch(`${API_BASE}/chats/${chatId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'progress':
                  onProgress?.(data.data);
                  break;
                case 'initial_responses':
                  onInitialResponses?.(data.data);
                  break;
                case 'discussion_round':
                  onDiscussionRound?.(data.data);
                  break;
                case 'consensus':
                  onConsensus?.(data.data);
                  break;
                case 'error':
                  onError?.(new Error(data.data.message));
                  break;
                case 'done':
                  onDone?.(data.data);
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    });

  // Return abort function
  return () => controller.abort();
}

