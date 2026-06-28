import { useEffect } from 'react';
import { Sidebar } from '../components/sidebar/Sidebar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { useChat } from '../context/ChatContext';

export function Chat() {
  const { startNewSession, activeSession } = useChat();

  // Always start with a fresh session on first load
  useEffect(() => {
    if (!activeSession) {
      startNewSession();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-base">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
