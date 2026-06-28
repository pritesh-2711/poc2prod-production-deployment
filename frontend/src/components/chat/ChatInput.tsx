import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Loader2, Paperclip, Send, Zap, BrainCircuit } from 'lucide-react';

type Mode = 'fast' | 'deep';

interface ChatInputProps {
  onSend: (text: string, mode: Mode) => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  isSending: boolean;
  disabled?: boolean;
}

const ACCEPTED = '.pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function ChatInput({ onSend, onUpload, isSending, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<Mode>('fast');
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || isSending || disabled) return;
    setValue('');
    resetHeight();
    await onSend(text, mode);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const resetHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected after an error
    e.target.value = '';
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  const canSend = value.trim().length > 0 && !isSending && !disabled;

  return (
    <div className="border-t border-surface-border bg-surface-raised px-4 py-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-surface-card border border-surface-border rounded-2xl px-4 py-3 focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/20 transition-all">
          {/* Paperclip — opens file picker */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            title={isUploading ? 'Processing…' : 'Upload PDF or DOCX'}
            className={`flex-shrink-0 p-1.5 rounded-lg mb-0.5 transition-all ${
              isUploading
                ? 'text-brand opacity-70 cursor-not-allowed'
                : 'text-ink-muted hover:text-brand hover:bg-brand/10'
            }`}
          >
            {isUploading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Paperclip size={17} />
            )}
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your documents…"
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent text-ink-primary placeholder-ink-muted text-sm resize-none outline-none leading-relaxed max-h-[200px] overflow-y-auto scrollbar-hide disabled:opacity-50"
          />

          {/* Send */}
          <button
            type="submit"
            disabled={!canSend}
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 mb-0.5 ${
              canSend
                ? 'bg-brand hover:bg-brand-dim text-white shadow-lg shadow-brand/25'
                : 'bg-surface-overlay text-ink-muted cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>

        {/* Bottom row: mode toggle (left) + keyboard hints (right) */}
        <div className="flex items-center justify-between mt-2">

          {/* Mode toggle — Off = Fast, On = Deep */}
          <button
            type="button"
            onClick={() => setMode(m => m === 'fast' ? 'deep' : 'fast')}
            disabled={disabled}
            title={mode === 'fast' ? 'Fast mode — switch to Deep' : 'Deep mode — switch to Fast'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-200 ${
              mode === 'deep'
                ? 'bg-brand/15 border-brand/40 text-brand'
                : 'bg-surface-card border-surface-border text-ink-muted hover:text-ink-primary hover:border-surface-border/80'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {mode === 'fast' ? (
              <Zap size={11} className="flex-shrink-0" />
            ) : (
              <BrainCircuit size={11} className="flex-shrink-0" />
            )}
            <span>{mode === 'fast' ? 'Fast' : 'Deep'}</span>
          </button>

          {/* Keyboard hints */}
          <p className="text-ink-muted text-xs">
            <kbd className="px-1 py-0.5 bg-surface-card border border-surface-border rounded text-xs">Enter</kbd> to send &nbsp;·&nbsp;
            <kbd className="px-1 py-0.5 bg-surface-card border border-surface-border rounded text-xs">Shift+Enter</kbd> new line
          </p>

        </div>
      </form>
    </div>
  );
}
