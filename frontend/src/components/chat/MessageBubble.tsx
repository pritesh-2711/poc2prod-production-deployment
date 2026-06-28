import { useState } from 'react';
import { Copy, Check, User } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { MermaidDiagram } from './MermaidDiagram';

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 animate-slide-up">
        <div className="max-w-[75%]">
          <div className="bg-brand px-4 py-3 rounded-2xl rounded-tr-sm text-white text-sm leading-relaxed">
            {message.message}
          </div>
          <p className="text-ink-muted text-xs mt-1 text-right">{formatTime(message.created_at)}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center flex-shrink-0 mt-1">
          <User size={13} className="text-white" />
        </div>
      </div>
    );
  }

  const parts = parseMessageParts(message.message);
  const charts = (message as any).charts as string[] | undefined;

  return (
    <div className="flex gap-3 animate-slide-up">
      {/* Assistant avatar */}
      <div className="w-7 h-7 rounded-full bg-surface-card border border-surface-border flex items-center justify-center flex-shrink-0 mt-1">
        <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
          <path d="M4 8C4 5.79 5.79 4 8 4h12c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4h-4l-4 4v-4H8c-2.21 0-4-1.79-4-4V8z" fill="#5B6EF5" fillOpacity="0.4" stroke="#5B6EF5" strokeWidth="1.5"/>
          <circle cx="10" cy="12" r="1.2" fill="#818CF8"/>
          <circle cx="14" cy="12" r="1.2" fill="#818CF8"/>
          <circle cx="18" cy="12" r="1.2" fill="#818CF8"/>
        </svg>
      </div>

      <div className="max-w-[75%] flex-1">
        <div className="bg-surface-card border border-surface-border px-4 py-3 rounded-2xl rounded-tl-sm group relative">
          {/* Message text with mermaid blocks split out */}
          {parts.map((part, i) =>
            part.type === 'text' ? (
              <div
                key={i}
                className="text-ink-primary text-sm leading-relaxed message-content whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(part.content) }}
              />
            ) : (
              <MermaidDiagram key={i} code={part.code} />
            )
          )}

          {/* E2B-generated charts (base64 PNGs) */}
          {charts && charts.length > 0 && (
            <div className="mt-3 space-y-2">
              {charts.map((b64, i) => (
                <img
                  key={i}
                  src={`data:image/png;base64,${b64}`}
                  alt={`Chart ${i + 1}`}
                  className="max-w-full rounded-lg border border-surface-border"
                />
              ))}
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-ink-muted hover:text-ink-secondary hover:bg-surface-overlay opacity-0 group-hover:opacity-100 transition-all"
            title="Copy message"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          </button>
        </div>
        <p className="text-ink-muted text-xs mt-1 ml-1">{formatTime(message.created_at)}</p>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-surface-card border border-surface-border flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
          <path d="M4 8C4 5.79 5.79 4 8 4h12c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4h-4l-4 4v-4H8c-2.21 0-4-1.79-4-4V8z" fill="#5B6EF5" fillOpacity="0.4" stroke="#5B6EF5" strokeWidth="1.5"/>
          <circle cx="10" cy="12" r="1.2" fill="#818CF8"/>
          <circle cx="14" cy="12" r="1.2" fill="#818CF8"/>
          <circle cx="18" cy="12" r="1.2" fill="#818CF8"/>
        </svg>
      </div>
      <div className="bg-surface-card border border-surface-border px-4 py-3.5 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'mermaid'; code: string };

const _MERMAID_BLOCK_RE = /```mermaid\s*\n([\s\S]*?)```/g;

/** Split message text into plain-text and mermaid-diagram parts. */
function parseMessageParts(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  _MERMAID_BLOCK_RE.lastIndex = 0;

  while ((match = _MERMAID_BLOCK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mermaid', code: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

/** Very minimal markdown formatter (bold, inline code, line breaks) */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');
}
