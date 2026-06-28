import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-3xl" />
      </div>

      {/* Grid lines overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#5B6EF5 1px, transparent 1px), linear-gradient(90deg, #5B6EF5 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 border border-brand/30 mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 8C4 5.79 5.79 4 8 4h12c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4h-4l-4 4v-4H8c-2.21 0-4-1.79-4-4V8z" fill="#5B6EF5" fillOpacity="0.3" stroke="#5B6EF5" strokeWidth="1.5"/>
              <circle cx="10" cy="12" r="1.5" fill="#818CF8"/>
              <circle cx="14" cy="12" r="1.5" fill="#818CF8"/>
              <circle cx="18" cy="12" r="1.5" fill="#818CF8"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink-primary tracking-tight">
            AI Research Assistant
          </h1>
          <p className="text-ink-secondary text-sm mt-1">GenAI Research Assistant</p>
        </div>

        {children}
      </div>
    </div>
  );
}
