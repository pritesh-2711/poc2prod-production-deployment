import { useEffect, useRef } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { ChatInput } from './ChatInput';
import { PersonalDrive } from '../drive/PersonalDrive';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useDocumentsStore } from '../../store/documentsStore';
import { DEMO_MODE } from '../../services/api';

export function ChatWindow() {
  const { user } = useAuth();
  const { messages, isLoadingMessages, isSending, sendUserMessage, activeSession } = useChat();
  const { driveOpen, toggleDrive, uploadFile, clearUploads } = useDocumentsStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Clear upload entries when session changes
  useEffect(() => {
    clearUploads();
  }, [activeSession?.session_id, clearUploads]);

  const handleSend = async (text: string, mode: 'fast' | 'deep') => {
    await sendUserMessage(text, mode);
  };

  const handleUpload = async (file: File) => {
    if (!activeSession) return;
    await uploadFile(activeSession.session_id, file);
  };

  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0 h-full bg-surface-raised">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-ink-primary font-semibold text-sm truncate">
              {activeSession?.session_name ?? 'New Chat'}
            </h2>
            <p className="text-ink-muted text-xs mt-0.5">
              {messages.length > 0
                ? `${messages.length} message${messages.length !== 1 ? 's' : ''}`
                : 'Start a conversation'}
            </p>
          </div>

          {/* Connection badge */}
          <div
            className={`flex-shrink-0 px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              DEMO_MODE
                ? 'bg-surface-card border-surface-border'
                : 'bg-success/10 border-success/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                DEMO_MODE ? 'bg-ink-muted' : 'bg-success animate-pulse'
              }`}
            />
            <span className={`text-xs ${DEMO_MODE ? 'text-ink-muted' : 'text-success'}`}>
              {DEMO_MODE ? 'Demo Mode' : 'Live'}
            </span>
          </div>

          {/* Personal Drive toggle */}
          <button
            onClick={toggleDrive}
            title="My Personal Drive"
            className={`flex-shrink-0 p-2 rounded-xl transition-all ${
              driveOpen
                ? 'bg-brand/15 text-brand border border-brand/30'
                : 'text-ink-muted hover:text-brand hover:bg-brand/10 border border-transparent'
            }`}
          >
            <HardDrive size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-ink-muted" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState onSuggestion={(text) => handleSend(text, 'fast')} userName={user?.name} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.chat_id} message={msg} />
              ))}
              {isSending && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onUpload={handleUpload}
          isSending={isSending}
          disabled={!activeSession}
        />
      </div>

      {/* Personal Drive panel (right) */}
      <PersonalDrive sessionId={activeSession?.session_id ?? null} />
    </div>
  );
}
