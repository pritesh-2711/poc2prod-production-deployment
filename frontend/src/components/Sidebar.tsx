import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import styles from './Sidebar.module.css'

interface Props {
  onSignout: () => void
  onToggleDrive: () => void
  driveOpen: boolean
}

export default function Sidebar({ onSignout, onToggleDrive, driveOpen }: Props) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const {
    sessions,
    activeSessionId,
    loadingSessions,
    selectSession,
    createSession,
    deleteSession,
    terminateSession,
  } = useChatStore()

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNewInput, setShowNewInput] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim() || `Session ${sessions.length + 1}`
    setCreating(true)
    await createSession(name)
    setCreating(false)
    setNewName('')
    setShowNewInput(false)
  }

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setMenuOpen(null)
    await deleteSession(sessionId)
  }

  const handleTerminate = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setMenuOpen(null)
    await terminateSession(sessionId)
  }

  const toggleMenu = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setMenuOpen(menuOpen === sessionId ? null : sessionId)
  }

  const activeSessions = sessions.filter((s) => s.is_active)
  const endedSessions = sessions.filter((s) => !s.is_active)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <aside className={styles.root} onClick={() => setMenuOpen(null)}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark} />
          <span className={styles.logoText}>Assistant</span>
        </div>
      </div>

      <div className={styles.newSession}>
        {showNewInput ? (
          <form className={styles.newForm} onSubmit={handleCreate}>
            <input
              className={styles.newInput}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Session name..."
              autoFocus
            />
            <button className={styles.newConfirm} type="submit" disabled={creating}>
              {creating ? <span className={styles.spinnerSm} /> : 'Create'}
            </button>
            <button
              className={styles.newCancel}
              type="button"
              onClick={() => setShowNewInput(false)}
            >
              ✕
            </button>
          </form>
        ) : (
          <button className={styles.newBtn} onClick={() => setShowNewInput(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New session
          </button>
        )}
      </div>

      <div className={styles.sessions}>
        {loadingSessions && (
          <div className={styles.loading}>
            <span className={styles.spinnerSm} />
          </div>
        )}

        {!loadingSessions && sessions.length === 0 && (
          <p className={styles.empty}>No sessions yet</p>
        )}

        {activeSessions.length > 0 && (
          <>
            <p className={styles.groupLabel}>Active</p>
            {activeSessions.map((s) => (
              <SessionItem
                key={s.session_id}
                sessionId={s.session_id}
                name={s.session_name}
                date={formatDate(s.created_at)}
                active={activeSessionId === s.session_id}
                isActive={s.is_active}
                menuOpen={menuOpen === s.session_id}
                onClick={() => selectSession(s.session_id)}
                onMenuToggle={(e) => toggleMenu(e, s.session_id)}
                onDelete={(e) => handleDelete(e, s.session_id)}
                onTerminate={(e) => handleTerminate(e, s.session_id)}
              />
            ))}
          </>
        )}

        {endedSessions.length > 0 && (
          <>
            <p className={styles.groupLabel}>Ended</p>
            {endedSessions.map((s) => (
              <SessionItem
                key={s.session_id}
                sessionId={s.session_id}
                name={s.session_name}
                date={formatDate(s.created_at)}
                active={activeSessionId === s.session_id}
                isActive={false}
                menuOpen={menuOpen === s.session_id}
                onClick={() => selectSession(s.session_id)}
                onMenuToggle={(e) => toggleMenu(e, s.session_id)}
                onDelete={(e) => handleDelete(e, s.session_id)}
                onTerminate={() => {}}
              />
            ))}
          </>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
        </div>
        <div className={styles.footerActions}>
          {user?.is_admin && (
            <button
              className={styles.driveBtn}
              onClick={() => navigate('/admin')}
              title="Admin dashboard"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="8.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="1.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="8.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            </button>
          )}
          <button
            className={`${styles.driveBtn} ${driveOpen ? styles.driveBtnActive : ''}`}
            onClick={onToggleDrive}
            title="My Documents"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="2" y="3" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 7h5M5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className={styles.signout} onClick={onSignout} title="Sign out">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M5.5 3H3a1 1 0 00-1 1v7a1 1 0 001 1h2.5M9.5 10l3-2.5-3-2.5M12.5 7.5H5.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

interface SessionItemProps {
  sessionId: string
  name: string
  date: string
  active: boolean
  isActive: boolean
  menuOpen: boolean
  onClick: () => void
  onMenuToggle: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  onTerminate: (e: React.MouseEvent) => void
}

function SessionItem({
  name,
  date,
  active,
  isActive,
  menuOpen,
  onClick,
  onMenuToggle,
  onDelete,
  onTerminate,
}: SessionItemProps) {
  return (
    <div
      className={`${styles.sessionItem} ${active ? styles.sessionActive : ''}`}
      onClick={onClick}
    >
      <div className={styles.sessionInfo}>
        <span className={styles.sessionName}>{name}</span>
        <span className={styles.sessionDate}>{date}</span>
      </div>
      <div className={styles.sessionActions}>
        <button className={styles.menuBtn} onClick={onMenuToggle}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="2.5" r="1" fill="currentColor" />
            <circle cx="6.5" cy="6.5" r="1" fill="currentColor" />
            <circle cx="6.5" cy="10.5" r="1" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && (
          <div className={styles.menu}>
            {isActive && (
              <button className={styles.menuItem} onClick={onTerminate}>
                End session
              </button>
            )}
            <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={onDelete}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}