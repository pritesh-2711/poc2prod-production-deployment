import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../api/client'
import type {
  AdminChunkScore,
  AdminDocument,
  AdminFeedbackStats,
  AdminGovernanceFlag,
  AdminJobStatus,
  AdminMessage,
  AdminOverviewStats,
  AdminSession,
  AdminUser,
} from '../../types/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function shortId(id: string): string {
  return id.slice(0, 4) + '…' + id.slice(-4)
}

function scoreColor(score: number, invert = false): string {
  const bad = invert ? score > 0.5 : score < 0.5
  if (bad) return 'bg-red-900/60 text-red-300'
  if (score > 0.7) return 'bg-green-900/60 text-green-300'
  return 'bg-yellow-900/60 text-yellow-300'
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#2A2F45] bg-[#141720] p-5 flex flex-col gap-1">
      <span className="text-xs text-[#8892A4] uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold ${accent ? 'text-red-400' : 'text-[#F1F5FB]'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, title, subtitle, children }: {
  id: string; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#F1F5FB]">{title}</h2>
        {subtitle && <p className="text-xs text-[#8892A4] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#2A2F45]">
      <table className="w-full text-sm text-[#C8D0E0]">
        <thead>
          <tr className="border-b border-[#2A2F45] bg-[#141720]">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs text-[#8892A4] uppercase tracking-wide font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2235]">{children}</tbody>
      </table>
    </div>
  )
}

// ─── Overview section ─────────────────────────────────────────────────────────

function OverviewSection({ stats, activity }: {
  stats: AdminOverviewStats | null
  activity: Array<{ event_type: string; detail: string | null; occurred_at: string }>
}) {
  if (!stats) return <div className="text-[#8892A4] text-sm">Loading…</div>
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending approvals" value={stats.pending_approvals} accent={stats.pending_approvals > 0} />
        <StatCard label="Flagged responses" value={stats.flagged_responses} accent={stats.flagged_responses > 0} />
        <StatCard label="Active users (7d)" value={stats.active_users_7d} />
        <StatCard label="Job failures (24h)" value={stats.job_failures_24h} accent={stats.job_failures_24h > 0} />
      </div>
      <div className="rounded-xl border border-[#2A2F45] bg-[#141720] p-4">
        <p className="text-xs text-[#8892A4] uppercase tracking-wide mb-3">Recent activity</p>
        {activity.length === 0
          ? <p className="text-sm text-[#8892A4]">No recent activity.</p>
          : (
            <ul className="divide-y divide-[#1E2235]">
              {activity.slice(0, 8).map((e, i) => (
                <li key={i} className="py-2.5 flex justify-between text-sm">
                  <span className="text-[#C8D0E0]">
                    {e.event_type === 'signup' && `${e.detail} signed up — awaiting approval`}
                    {e.event_type === 'flagged' && `Response flagged by output guardrail — ${e.detail}`}
                    {e.event_type === 'job_run' && `${e.detail}`}
                    {!['signup', 'flagged', 'job_run'].includes(e.event_type) && e.detail}
                  </span>
                  <span className="text-[#8892A4] ml-4 shrink-0">{timeAgo(e.occurred_at)}</span>
                </li>
              ))}
            </ul>
          )
        }
      </div>
    </>
  )
}

// ─── User approvals section ───────────────────────────────────────────────────

function UserApprovalsSection({ users, onApprove, onReject }: {
  users: AdminUser[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  if (users.length === 0) {
    return <p className="text-sm text-[#8892A4]">No pending approvals.</p>
  }
  return (
    <Table headers={['Name', 'Email', 'Requested', '']}>
      {users.map((u) => (
        <tr key={u.user_id} className="hover:bg-[#1E2235]/40 transition-colors">
          <td className="px-4 py-3 font-medium">{u.name ?? '—'}</td>
          <td className="px-4 py-3 text-[#8892A4]">{u.email}</td>
          <td className="px-4 py-3 text-[#8892A4]">{timeAgo(u.created_at)}</td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <button
                onClick={() => onApprove(u.user_id)}
                className="px-3 py-1 text-xs rounded border border-[#5B6EF5] text-[#818CF8] hover:bg-[#5B6EF5]/20 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(u.user_id)}
                className="px-3 py-1 text-xs rounded border border-[#2A2F45] text-[#8892A4] hover:bg-[#2A2F45] transition-colors"
              >
                Reject
              </button>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  )
}

// ─── Conversations section ────────────────────────────────────────────────────

function ConversationsSection({ sessions, onView }: {
  sessions: AdminSession[]
  onView: (session: AdminSession) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = sessions.filter(
    (s) =>
      s.user_email.toLowerCase().includes(search.toLowerCase()) ||
      s.session_id.includes(search),
  )
  return (
    <>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by user or session id"
        className="mb-4 w-full rounded-lg border border-[#2A2F45] bg-[#0C0E14] px-3 py-2 text-sm text-[#C8D0E0] placeholder-[#8892A4] focus:outline-none focus:border-[#5B6EF5]"
      />
      {filtered.length === 0
        ? <p className="text-sm text-[#8892A4]">No sessions found.</p>
        : (
          <Table headers={['User', 'Started', 'Messages', 'Mode', '']}>
            {filtered.map((s) => (
              <tr key={s.session_id} className="hover:bg-[#1E2235]/40 transition-colors">
                <td className="px-4 py-3 font-medium">{s.user_email}</td>
                <td className="px-4 py-3 text-[#8892A4]">
                  {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">{s.message_count}</td>
                <td className="px-4 py-3 text-[#8892A4]">{s.last_mode ?? '—'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onView(s)}
                    className="px-3 py-1 text-xs rounded border border-[#2A2F45] text-[#8892A4] hover:bg-[#2A2F45] transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )
      }
    </>
  )
}

// ─── Session message modal ────────────────────────────────────────────────────

function SessionModal({ session, messages, onClose }: {
  session: AdminSession
  messages: AdminMessage[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl border border-[#2A2F45] bg-[#141720] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2F45]">
          <div>
            <p className="font-semibold text-[#F1F5FB]">{session.user_email}</p>
            <p className="text-xs text-[#8892A4]">{session.session_id}</p>
          </div>
          <button onClick={onClose} className="text-[#8892A4] hover:text-[#F1F5FB] text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {messages.map((m) => (
            <div
              key={m.chat_id}
              className={`rounded-xl px-4 py-3 text-sm max-w-[85%] ${
                m.sender === 'user'
                  ? 'ml-auto bg-[#5B6EF5]/20 text-[#C8D0E0]'
                  : 'bg-[#1E2235] text-[#C8D0E0]'
              }`}
            >
              <p className="text-xs text-[#8892A4] mb-1">{m.sender}</p>
              <p className="whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Feedback & RLHF section ──────────────────────────────────────────────────

function FeedbackSection({ stats, chunks }: {
  stats: AdminFeedbackStats | null
  chunks: AdminChunkScore[]
}) {
  if (!stats) return <div className="text-[#8892A4] text-sm">Loading…</div>
  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Ratings (7d)" value={stats.ratings_7d} />
        <StatCard label="Positive rate" value={`${stats.positive_rate}%`} />
        <StatCard label="rlhf_alpha" value={stats.rlhf_alpha} />
      </div>
      {chunks.length === 0
        ? <p className="text-sm text-[#8892A4]">No chunk scores yet.</p>
        : (
          <Table headers={['Chunk', 'Positive', 'Negative', 'Score']}>
            {chunks.map((c) => (
              <tr key={c.chunk_id} className="hover:bg-[#1E2235]/40 transition-colors">
                <td className="px-4 py-3 font-medium text-xs">
                  {c.filename} #{c.chunk_id.slice(-2)}
                </td>
                <td className="px-4 py-3">{c.positive_count}</td>
                <td className="px-4 py-3">{c.negative_count}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${scoreColor(c.score)}`}>
                    {c.score.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )
      }
    </>
  )
}

// ─── Governance section ───────────────────────────────────────────────────────

function GovernanceSection({ flags, onReview }: {
  flags: AdminGovernanceFlag[]
  onReview: (flag: AdminGovernanceFlag) => void
}) {
  if (flags.length === 0) {
    return <p className="text-sm text-[#8892A4]">No governance records yet — the output_guardrail job writes here hourly.</p>
  }
  return (
    <Table headers={['Chat id', 'Toxicity', 'Bias', 'Faithfulness', '']}>
      {flags.map((f) => (
        <tr key={f.id} className="hover:bg-[#1E2235]/40 transition-colors">
          <td className="px-4 py-3 font-mono text-xs">{shortId(f.chat_id)}</td>
          <td className="px-4 py-3">
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${scoreColor(f.toxicity_score, true)}`}>
              {f.toxicity_score.toFixed(2)}
            </span>
          </td>
          <td className="px-4 py-3">
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${scoreColor(f.bias_score, true)}`}>
              {f.bias_score.toFixed(2)}
            </span>
          </td>
          <td className="px-4 py-3">
            {f.faithfulness_score != null
              ? (
                <span className={`px-2 py-0.5 rounded text-xs font-mono ${scoreColor(f.faithfulness_score)}`}>
                  {f.faithfulness_score.toFixed(2)}
                </span>
              )
              : <span className="text-[#8892A4] text-xs">N/A</span>
            }
          </td>
          <td className="px-4 py-3">
            <button
              onClick={() => onReview(f)}
              className="px-3 py-1 text-xs rounded border border-[#2A2F45] text-[#8892A4] hover:bg-[#2A2F45] transition-colors"
            >
              Review
            </button>
          </td>
        </tr>
      ))}
    </Table>
  )
}

// ─── Background jobs section ──────────────────────────────────────────────────

function JobsSection({ jobs }: { jobs: AdminJobStatus[] }) {
  function statusBadge(s: string | null) {
    if (s === 'succeeded') return 'bg-green-900/60 text-green-300'
    if (s === 'failed') return 'bg-red-900/60 text-red-300'
    if (s === 'skipped') return 'bg-yellow-900/60 text-yellow-300'
    return 'bg-[#2A2F45] text-[#8892A4]'
  }

  if (jobs.length === 0) return <p className="text-sm text-[#8892A4]">No jobs registered.</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {jobs.map((j) => (
        <div key={j.job_id} className="rounded-xl border border-[#2A2F45] bg-[#141720] p-4 space-y-2">
          <p className="font-mono text-sm font-medium text-[#F1F5FB]">{j.job_id}</p>
          <p className="text-xs text-[#8892A4]">
            Every {j.interval_hours != null ? `${j.interval_hours}h` : '?'} ·{' '}
            {j.last_run ? `last run ${timeAgo(j.last_run)}` : 'not yet run'}
          </p>
          {j.next_run && (
            <p className="text-xs text-[#8892A4]">
              next: {new Date(j.next_run).toLocaleString()}
            </p>
          )}
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(j.status)}`}>
            {j.status ?? 'pending'}
          </span>
          {j.detail && <p className="text-xs text-[#8892A4] truncate">{j.detail}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Knowledge base section ───────────────────────────────────────────────────

function KnowledgeBaseSection({ docs, onDelete }: {
  docs: AdminDocument[]
  onDelete: (filename: string) => void
}) {
  if (docs.length === 0) return <p className="text-sm text-[#8892A4]">No documents ingested yet.</p>
  return (
    <Table headers={['Document', 'Chunks', 'Ingested', '']}>
      {docs.map((d) => (
        <tr key={d.filename} className="hover:bg-[#1E2235]/40 transition-colors">
          <td className="px-4 py-3 font-medium">{d.filename}</td>
          <td className="px-4 py-3">{d.child_chunks}</td>
          <td className="px-4 py-3 text-[#8892A4]">
            {d.ingested_at ? timeAgo(d.ingested_at) : '—'}
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-xs rounded border border-[#2A2F45] text-[#8892A4] hover:bg-[#2A2F45] transition-colors"
                disabled
                title="Reprocess triggers re-ingestion via chat; full UI coming in Ch 17"
              >
                Reprocess
              </button>
              <button
                onClick={() => onDelete(d.filename)}
                className="px-3 py-1 text-xs rounded border border-red-900 text-red-400 hover:bg-red-900/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  )
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '⊞' },
  { id: 'user-approvals', label: 'User approvals', icon: '👤' },
  { id: 'conversations', label: 'Conversations', icon: '💬' },
  { id: 'feedback', label: 'Feedback & RLHF', icon: '👍' },
  { id: 'governance', label: 'Governance', icon: '🛡' },
  { id: 'jobs', label: 'Background jobs', icon: '⏱' },
  { id: 'knowledge-base', label: 'Knowledge base', icon: '📁' },
]

// ─── AdminPage ────────────────────────────────────────────────────────────────

export default function AdminPage({ onExit }: { onExit: () => void }) {
  const [activeSection, setActiveSection] = useState('overview')

  // data state
  const [overviewStats, setOverviewStats] = useState<AdminOverviewStats | null>(null)
  const [activity, setActivity] = useState<Array<{ event_type: string; detail: string | null; occurred_at: string }>>([])
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([])
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [feedbackStats, setFeedbackStats] = useState<AdminFeedbackStats | null>(null)
  const [chunkScores, setChunkScores] = useState<AdminChunkScore[]>([])
  const [governanceFlags, setGovernanceFlags] = useState<AdminGovernanceFlag[]>([])
  const [jobs, setJobs] = useState<AdminJobStatus[]>([])
  const [documents, setDocuments] = useState<AdminDocument[]>([])

  // modal state
  const [viewingSession, setViewingSession] = useState<AdminSession | null>(null)
  const [sessionMessages, setSessionMessages] = useState<AdminMessage[]>([])

  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAll()
  }, [])

  // Sync sidebar highlight with scroll position inside the overflow container.
  //
  // Fixed lookahead (e.g. 80px) breaks at the bottom: sections like "Knowledge base"
  // have offsetTop > maxScrollTop + 80, so they never become active.
  //
  // Fix: use a dynamic lookahead that is small (80px) at the top of the page —
  // preventing premature activation — and expands to nearly the full viewport height
  // at the bottom, so every section can eventually be reached.
  useEffect(() => {
    const container = mainRef.current
    if (!container) return

    function onScroll() {
      const { scrollTop, scrollHeight, clientHeight } = container!
      const maxScroll = scrollHeight - clientHeight
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0  // 0 = top, 1 = bottom
      const lookahead = 80 + progress * Math.max(0, clientHeight - 160)
      const readingLine = scrollTop + lookahead

      let current = NAV_ITEMS[0].id
      for (const { id } of NAV_ITEMS) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= readingLine) current = id
      }
      setActiveSection(current)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  async function loadAll() {
    try {
      const [ov, pu, sess, fb, gov, j, docs] = await Promise.allSettled([
        adminApi.overview(),
        adminApi.listPendingUsers(),
        adminApi.listSessions(),
        adminApi.getFeedback(),
        adminApi.getGovernance(),
        adminApi.getJobs(),
        adminApi.listDocuments(),
      ])

      if (ov.status === 'fulfilled') {
        const r = ov.value as { stats: AdminOverviewStats; recent_activity: typeof activity }
        setOverviewStats(r.stats)
        setActivity(r.recent_activity)
      }
      if (pu.status === 'fulfilled') setPendingUsers(pu.value as AdminUser[])
      if (sess.status === 'fulfilled') setSessions(sess.value as AdminSession[])
      if (fb.status === 'fulfilled') {
        const r = fb.value as { stats: AdminFeedbackStats; chunk_scores: AdminChunkScore[] }
        setFeedbackStats(r.stats)
        setChunkScores(r.chunk_scores)
      }
      if (gov.status === 'fulfilled') setGovernanceFlags(gov.value as AdminGovernanceFlag[])
      if (j.status === 'fulfilled') setJobs(j.value as AdminJobStatus[])
      if (docs.status === 'fulfilled') setDocuments(docs.value as AdminDocument[])
    } catch {
      // partial failures already handled per-settled above
    }
  }

  async function handleApprove(userId: string) {
    await adminApi.approveUser(userId)
    setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId))
    setOverviewStats((prev) => prev ? { ...prev, pending_approvals: prev.pending_approvals - 1 } : prev)
  }

  async function handleReject(userId: string) {
    await adminApi.rejectUser(userId)
    setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId))
    setOverviewStats((prev) => prev ? { ...prev, pending_approvals: prev.pending_approvals - 1 } : prev)
  }

  async function handleViewSession(session: AdminSession) {
    setViewingSession(session)
    const msgs = await adminApi.getSessionMessages(session.session_id)
    setSessionMessages(msgs)
  }

  async function handleDeleteDocument(filename: string) {
    if (!confirm(`Delete all chunks for "${filename}"? This cannot be undone.`)) return
    await adminApi.deleteDocument(filename)
    setDocuments((prev) => prev.filter((d) => d.filename !== filename))
  }

  function scrollTo(id: string) {
    const container = mainRef.current
    const el = document.getElementById(id)
    if (!container || !el) return
    // Scroll within the overflow container, not the browser viewport
    const elTop = el.getBoundingClientRect().top
    const containerTop = container.getBoundingClientRect().top
    container.scrollTo({ top: container.scrollTop + elTop - containerTop - 32, behavior: 'smooth' })
    // Optimistically set active; scroll listener will correct it once scrolling settles
    setActiveSection(id)
  }

  return (
    <div className="flex h-screen bg-[#0C0E14] text-[#F1F5FB] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-[#2A2F45] bg-[#0F111A] flex flex-col py-4">
        <div className="px-4 mb-6">
          <p className="text-xs text-[#8892A4] uppercase tracking-wider mb-1">POC2Production</p>
          <p className="text-sm font-semibold text-[#F1F5FB]">Admin</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
                activeSection === item.id
                  ? 'bg-[#5B6EF5]/20 text-[#818CF8]'
                  : 'text-[#8892A4] hover:text-[#C8D0E0] hover:bg-[#1E2235]'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 pt-4 border-t border-[#2A2F45]">
          <button
            onClick={onExit}
            className="text-xs text-[#8892A4] hover:text-[#F1F5FB] transition-colors"
          >
            ← Back to chat
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto p-8">
        <Section id="overview" title="Overview">
          <OverviewSection stats={overviewStats} activity={activity} />
        </Section>

        <Section id="user-approvals" title="User approvals">
          <UserApprovalsSection
            users={pendingUsers}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </Section>

        <Section id="conversations" title="Conversations" subtitle="Browse sessions across all users">
          <ConversationsSection sessions={sessions} onView={handleViewSession} />
        </Section>

        <Section id="feedback" title="Feedback & RLHF" subtitle="Aggregate ratings and chunk quality scores">
          <FeedbackSection stats={feedbackStats} chunks={chunkScores} />
        </Section>

        <Section id="governance" title="Governance" subtitle="Output guardrail metrics — written hourly by output_guardrail_job">
          <GovernanceSection
            flags={governanceFlags}
            onReview={(f) => {
              // navigate to the session containing this chat
              const s = sessions.find((s) => s.session_id === f.session_id)
              if (s) handleViewSession(s)
            }}
          />
        </Section>

        <Section id="jobs" title="Background jobs">
          <JobsSection jobs={jobs} />
        </Section>

        <Section id="knowledge-base" title="Knowledge base" subtitle="All ingested documents across all users">
          <KnowledgeBaseSection docs={documents} onDelete={handleDeleteDocument} />
        </Section>
      </main>

      {/* Session modal */}
      {viewingSession && (
        <SessionModal
          session={viewingSession}
          messages={sessionMessages}
          onClose={() => { setViewingSession(null); setSessionMessages([]) }}
        />
      )}
    </div>
  )
}
