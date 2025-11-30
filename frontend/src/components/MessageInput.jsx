import { useState, useRef, useCallback, memo } from 'react';
import { Send, Loader2, Plus, X, FileText, FileCode, FileSpreadsheet, File } from 'lucide-react';

const MAX_FILES = 15;
const MAX_FILE_SIZE_MB = 5;
const MAX_TOTAL_SIZE_MB = 25;

// Get icon for file type
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const codeExts = ['py', 'js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'html', 'css', 'sql'];
  const spreadsheetExts = ['xlsx', 'xls', 'csv'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'md'];
  
  if (codeExts.includes(ext)) return FileCode;
  if (spreadsheetExts.includes(ext)) return FileSpreadsheet;
  if (docExts.includes(ext)) return FileText;
  return File;
};

// Format file size
const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageInput = memo(function MessageInput({ onSendMessage, isLoading, chatId }) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const heightRef = useRef(48);

  // Reset input when chat changes
  const lastChatIdRef = useRef(chatId);
  if (chatId !== lastChatIdRef.current) {
    lastChatIdRef.current = chatId;
    setInput('');
    setFiles([]);
    setError(null);
  }

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if ((!input.trim() && files.length === 0) || isLoading) return;
    
    onSendMessage(input.trim(), files);
    setInput('');
    setFiles([]);
    setError(null);
    // Reset height
    if (inputRef.current) {
      inputRef.current.style.height = '48px';
    }
    heightRef.current = 48;
  }, [input, files, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  const handleInput = useCallback((e) => {
    const el = e.target;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 128);
    if (Math.abs(newHeight - heightRef.current) > 4) {
      heightRef.current = newHeight;
      el.style.height = newHeight + 'px';
    } else {
      el.style.height = heightRef.current + 'px';
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);
    
    // Check total count
    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`Максимум ${MAX_FILES} файлов`);
      return;
    }
    
    // Check individual and total size
    let totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const validFiles = [];
    
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`Файл "${file.name}" слишком большой (макс. ${MAX_FILE_SIZE_MB} МБ)`);
        continue;
      }
      
      if (totalSize + file.size > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
        setError(`Общий размер файлов превышает ${MAX_TOTAL_SIZE_MB} МБ`);
        break;
      }
      
      totalSize += file.size;
      validFiles.push(file);
    }
    
    setFiles(prev => [...prev, ...validFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files]);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="border-t border-council-border bg-council-bg p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        {/* Files list */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((file, index) => {
              const Icon = getFileIcon(file.name);
              return (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-council-surface rounded-lg text-sm border border-council-border"
                >
                  <Icon size={14} className="text-council-accent" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <span className="text-council-text-secondary text-xs">
                    {formatSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-0.5 hover:bg-council-hover rounded transition-colors"
                  >
                    <X size={14} className="text-council-text-secondary hover:text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="mb-2 text-sm text-red-400 px-2">
            {error}
          </div>
        )}
        
        <div className="relative flex items-end gap-2 bg-council-sidebar rounded-2xl border border-council-border focus-within:border-council-accent/50 transition-colors">
          {/* File upload button */}
          <button
            type="button"
            onClick={openFileDialog}
            disabled={isLoading || files.length >= MAX_FILES}
            className={`m-2 p-2 rounded-lg transition-colors ${
              isLoading || files.length >= MAX_FILES
                ? 'text-council-text-secondary cursor-not-allowed'
                : 'text-council-text-secondary hover:text-council-accent hover:bg-council-hover'
            }`}
            title="Прикрепить файлы"
          >
            <Plus size={20} />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.md,.json,.xml,.csv,.yaml,.yml,.py,.js,.ts,.jsx,.tsx,.html,.css,.scss,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.rb,.php,.sql,.sh,.bash,.zsh,.ps1,.ini,.cfg,.conf,.env,.toml"
          />
          
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={files.length > 0 ? "Добавьте комментарий к файлам..." : "Задайте вопрос совету..."}
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent py-3 resize-none outline-none text-council-text placeholder-council-text-secondary max-h-32 overflow-y-auto"
            style={{ 
              minHeight: '48px',
              height: heightRef.current + 'px',
            }}
          />
          <button
            type="submit"
            disabled={((!input.trim() && files.length === 0) || isLoading)}
            className={`m-2 p-2 rounded-lg transition-colors ${
              (input.trim() || files.length > 0) && !isLoading
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
          {files.length > 0 
            ? `${files.length}/${MAX_FILES} файлов • Совет проанализирует содержимое`
            : 'Совет обсуждает ваш вопрос и приходит к консенсусу'
          }
        </p>
      </form>
    </div>
  );
});

export default MessageInput;
