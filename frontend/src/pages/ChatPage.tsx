import { useEffect } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useDocumentsStore } from '../store/documentsStore'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import { PersonalDrive } from '../components/drive/PersonalDrive'
import styles from './ChatPage.module.css'

export default function ChatPage() {
  const loadSessions = useChatStore((s) => s.loadSessions)
  const reset = useChatStore((s) => s.reset)
  const signout = useAuthStore((s) => s.signout)
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const { driveOpen, toggleDrive, loadDocuments } = useDocumentsStore()

  useEffect(() => {
    loadSessions()
    return () => reset()
  }, [loadSessions, reset])

  // Reload document list whenever active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadDocuments(activeSessionId)
    }
  }, [activeSessionId, loadDocuments])

  const handleSignout = async () => {
    reset()
    await signout()
  }

  return (
    <div className={styles.root}>
      <Sidebar onSignout={handleSignout} onToggleDrive={toggleDrive} driveOpen={driveOpen} />
      <main className={styles.main}>
        <ChatArea />
      </main>
      <PersonalDrive sessionId={activeSessionId} />
    </div>
  )
}