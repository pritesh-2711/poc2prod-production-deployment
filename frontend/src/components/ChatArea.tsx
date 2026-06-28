import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useDocumentsStore } from '../store/documentsStore'
import MessageBubble from './MessageBubble'
import styles from './ChatArea.module.css'

export default function ChatArea() {
  const {
    messages,
    sending,
    streamingContent,
    statusContent,
    error,
    activeSessionId,
    loadingMessages,
    sendMessage,
    clearError,
    selectedCategory,
    selectedVariant,
    setExecutionMode,
  } = useChatStore()
  const user = useAuthStore((s) => s.user)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploadFile } = useDocumentsStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeSessionId) return
    e.target.value = ''
    await uploadFile(activeSessionId, file)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, streamingContent])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await sendMessage(text, selectedCategory, selectedVariant)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    const msgs = messagesRef.current
    // Pin scroll to bottom before resizing so the layout shift doesn't move content
    const wasAtBottom = msgs
      ? msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80
      : false
    el.style.height = '1px'
    requestAnimationFrame(() => {
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`
      if (wasAtBottom && msgs) {
        msgs.scrollTop = msgs.scrollHeight
      }
    })
  }

  const noSession = !activeSessionId
  const isWorkflow = selectedCategory === 'workflow'
  const isAgent = selectedCategory === 'agent'

  return (
    <div className={styles.root}>
      <div className={styles.messages} ref={messagesRef}>
        {noSession ? (
          <div className={styles.emptyInner}>
            <span className={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="24" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 13h12M10 18h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <p className={styles.emptyTitle}>No session selected</p>
            <p className={styles.emptyHint}>Create a new session from the sidebar to start chatting.</p>
          </div>
        ) : (
          <>
            {loadingMessages && (
              <div className={styles.loadingRow}>
                <span className={styles.spinner} />
              </div>
            )}

            {!loadingMessages && messages.length === 0 && (
              <div className={styles.startHint}>
                <p>Start the conversation</p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.chat_id}
                message={msg.message}
                sender={msg.sender}
                createdAt={msg.created_at}
                userName={user?.name ?? 'You'}
                charts={msg.charts}
                chatId={msg.sender === 'assistant' ? msg.chat_id : undefined}
                sessionId={msg.sender === 'assistant' ? msg.session_id : undefined}
              />
            ))}

            {sending && streamingContent === '' && (
              <div className={styles.thinking}>
                <span className={styles.thinkingDot} />
                <span className={styles.thinkingDot} />
                <span className={styles.thinkingDot} />
                {statusContent && (
                  <span key={statusContent} className={styles.thinkingStatus}>
                    {statusContent}
                  </span>
                )}
              </div>
            )}

            {streamingContent !== null && streamingContent !== '' && (
              <MessageBubble
                message={streamingContent}
                sender="assistant"
                createdAt={new Date().toISOString()}
                userName={user?.name ?? 'You'}
              />
            )}

            {error && (
              <div className={styles.errorBanner}>
                <span>{error}</span>
                <button onClick={clearError}>✕</button>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className={`${styles.inputArea} ${noSession ? styles.inputAreaDisabled : ''}`}>
        <div className={styles.inputWrap}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={noSession}
            title={noSession ? 'Create a session first' : 'Upload document (PDF or DOCX)'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 2v7M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={noSession ? 'Create a session to start chatting…' : 'Message… (Enter to send, Shift+Enter for newline)'}
            rows={1}
            disabled={sending || noSession}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          <button
            className={`${styles.sendBtn} ${!input.trim() || sending || noSession ? styles.sendBtnDisabled : ''}`}
            onClick={handleSend}
            disabled={!input.trim() || sending || noSession}
            title="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8h12M9 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.hintRow}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={noSession}
              onClick={() =>
                setExecutionMode(
                  'workflow',
                  selectedVariant === 'single_rag_agent'
                    || selectedVariant === 'supervisor_orchestration_agent'
                    ? 'fast'
                    : selectedVariant,
                )
              }
              title="Use deterministic workflow orchestration"
              className={`${styles.modeToggle} ${isWorkflow ? styles.modeToggleDeep : ''}`}
            >
              <span className={styles.modeDot} />
              Workflows
            </button>

            <button
              type="button"
              disabled={noSession}
              onClick={() => setExecutionMode('agent', 'single_rag_agent')}
              title="Use the single RAG agent"
              className={`${styles.modeToggle} ${isAgent ? styles.modeToggleDeep : ''}`}
            >
              <span className={styles.modeDot} />
              Agents
            </button>

            {isWorkflow ? (
              <>
                <button
                  type="button"
                  disabled={noSession}
                  onClick={() => setExecutionMode('workflow', 'fast')}
                  title="Fast workflow"
                  className={`${styles.modeToggle} ${selectedVariant === 'fast' ? styles.modeToggleDeep : ''}`}
                >
                  <span className={styles.modeDot} />
                  Fast
                </button>

                <button
                  type="button"
                  disabled={noSession}
                  onClick={() => setExecutionMode('workflow', 'deep')}
                  title="Deep workflow"
                  className={`${styles.modeToggle} ${selectedVariant === 'deep' ? styles.modeToggleDeep : ''}`}
                >
                  <span className={styles.modeDot} />
                  Deep
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={noSession}
                  onClick={() => setExecutionMode('agent', 'single_rag_agent')}
                  title="Single agent with access to all high-level tools"
                  className={`${styles.modeToggle} ${selectedVariant === 'single_rag_agent' ? styles.modeToggleDeep : ''}`}
                >
                  <span className={styles.modeDot} />
                  Single RAG Agent
                </button>
                <button
                  type="button"
                  disabled={noSession}
                  onClick={() => setExecutionMode('agent', 'supervisor_orchestration_agent')}
                  title="Supervisor delegating to document, web, and math workers"
                  className={`${styles.modeToggle} ${selectedVariant === 'supervisor_orchestration_agent' ? styles.modeToggleDeep : ''}`}
                >
                  <span className={styles.modeDot} />
                  Supervisor Agent
                </button>
              </>
            )}
          </div>

          <p className={styles.hint}>Shift+Enter for newline</p>
        </div>
      </div>
    </div>
  )
}
