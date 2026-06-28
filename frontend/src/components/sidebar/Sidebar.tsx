import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, MessageSquare, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sessions, activeSession, isLoadingSessions, loadSessions, selectSession, startNewSession } = useChat();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleLogout = async () => {
    await logout();
    navigate('/signin', { replace: true });
  };

  const handleNewChat = async () => {
    await startNewSession();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Group sessions by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groupedSessions = sessions.reduce<{ today: typeof sessions; yesterday: typeof sessions; older: typeof sessions }>(
    (acc, s) => {
      const d = new Date(s.created_at);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() >= today.getTime()) acc.today.push(s);
      else if (d.getTime() >= yesterday.getTime()) acc.yesterday.push(s);
      else acc.older.push(s);
      return acc;
    },
    { today: [], yesterday: [], older: [] },
  );

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-surface-overlay border-r border-surface-border h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-surface-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
            <path d="M4 8C4 5.79 5.79 4 8 4h12c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4h-4l-4 4v-4H8c-2.21 0-4-1.79-4-4V8z" fill="#5B6EF5" fillOpacity="0.4" stroke="#5B6EF5" strokeWidth="1.5"/>
            <circle cx="10" cy="12" r="1.5" fill="#818CF8"/>
            <circle cx="14" cy="12" r="1.5" fill="#818CF8"/>
            <circle cx="18" cy="12" r="1.5" fill="#818CF8"/>
          </svg>
        </div>
        <div>
          <p className="text-ink-primary font-semibold text-sm leading-tight">AI Assistant</p>
          <p className="text-ink-muted text-xs">Research Chat</p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-brand/10 hover:bg-brand/20 border border-brand/25 rounded-xl text-brand text-sm font-medium transition-all duration-200 group"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-ink-muted" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare size={24} className="text-ink-muted mx-auto mb-2" />
            <p className="text-ink-muted text-xs">No previous sessions</p>
          </div>
        ) : (
          <>
            {groupedSessions.today.length > 0 && (
              <SessionGroup label="Today" sessions={groupedSessions.today} activeId={activeSession?.session_id} onSelect={selectSession} formatDate={formatSessionDate} />
            )}
            {groupedSessions.yesterday.length > 0 && (
              <SessionGroup label="Yesterday" sessions={groupedSessions.yesterday} activeId={activeSession?.session_id} onSelect={selectSession} formatDate={formatSessionDate} />
            )}
            {groupedSessions.older.length > 0 && (
              <SessionGroup label="Earlier" sessions={groupedSessions.older} activeId={activeSession?.session_id} onSelect={selectSession} formatDate={formatSessionDate} />
            )}
          </>
        )}
      </div>

      {/* User Footer */}
      <div className="border-t border-surface-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl group">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(user?.name ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink-primary text-sm font-medium truncate">{user?.name}</p>
            <p className="text-ink-muted text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 transition-all flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

interface SessionGroupProps {
  label: string;
  sessions: ReturnType<typeof useChat>['sessions'];
  activeId: string | undefined;
  onSelect: (s: ReturnType<typeof useChat>['sessions'][0]) => Promise<void>;
  formatDate: (iso: string) => string;
}

function SessionGroup({ label, sessions, activeId, onSelect, formatDate }: SessionGroupProps) {
  return (
    <div className="mb-1">
      <p className="text-ink-muted text-xs font-medium px-2 py-1.5 uppercase tracking-wide">{label}</p>
      {sessions.map(session => (
        <SessionItem
          key={session.session_id}
          session={session}
          isActive={session.session_id === activeId}
          onSelect={() => onSelect(session)}
          date={formatDate(session.created_at)}
        />
      ))}
    </div>
  );
}

interface SessionItemProps {
  session: ReturnType<typeof useChat>['sessions'][0];
  isActive: boolean;
  onSelect: () => void;
  date: string;
}

function SessionItem({ session, isActive, onSelect, date }: SessionItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 group relative transition-all duration-150 ${
        isActive
          ? 'bg-brand/15 border border-brand/30'
          : 'hover:bg-surface-card border border-transparent hover:border-surface-border'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <MessageSquare
          size={13}
          className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted'}`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${isActive ? 'text-ink-primary' : 'text-ink-secondary'}`}>
            {session.session_name}
          </p>
          {session.preview && (
            <p className="text-ink-muted text-xs truncate mt-0.5 leading-tight">
              {session.preview}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-xs ${isActive ? 'text-brand/70' : 'text-ink-muted'}`}>
            <Clock size={10} className="inline mr-0.5" />
            {date}
          </span>
        </div>
      </div>
    </button>
  );
}
