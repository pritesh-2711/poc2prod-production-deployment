import { Sparkles, BookOpen, Search, Brain } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: BookOpen,
    title: 'Summarize a paper',
    prompt: 'Can you help me summarize the key findings of a research paper?',
  },
  {
    icon: Search,
    title: 'Find key concepts',
    prompt: 'What are the most important concepts I should understand about machine learning?',
  },
  {
    icon: Brain,
    title: 'Explain methodology',
    prompt: 'Explain the difference between quantitative and qualitative research methods.',
  },
];

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
  userName?: string;
}

export function EmptyState({ onSuggestion, userName }: EmptyStateProps) {
  const firstName = userName?.split(' ')[0] ?? 'there';

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
      {/* Hero icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <path d="M4 8C4 5.79 5.79 4 8 4h12c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4h-4l-4 4v-4H8c-2.21 0-4-1.79-4-4V8z" fill="#5B6EF5" fillOpacity="0.2" stroke="#5B6EF5" strokeWidth="1.5"/>
            <circle cx="10" cy="12" r="1.5" fill="#818CF8"/>
            <circle cx="14" cy="12" r="1.5" fill="#818CF8"/>
            <circle cx="18" cy="12" r="1.5" fill="#818CF8"/>
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-surface-card border border-surface-border flex items-center justify-center">
          <Sparkles size={12} className="text-brand-glow" />
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-ink-primary mb-2 text-center">
        Hi, {firstName}!
      </h2>
      <p className="text-ink-secondary text-center max-w-sm leading-relaxed mb-10">
        I'm your AI research assistant. Ask me anything — about documents, concepts, or any topic you're exploring.
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
          <button
            key={title}
            onClick={() => onSuggestion(prompt)}
            className="text-left p-4 bg-surface-card border border-surface-border rounded-xl hover:border-brand/40 hover:bg-brand/5 transition-all duration-200 group"
          >
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center mb-3 group-hover:bg-brand/20 transition-colors">
              <Icon size={15} className="text-brand" />
            </div>
            <p className="text-ink-secondary text-xs font-medium mb-1">{title}</p>
            <p className="text-ink-muted text-xs leading-relaxed line-clamp-2">{prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
