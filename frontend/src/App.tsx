import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/admin/AdminPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  if (!token) return <Navigate to="/auth" replace />
  // While user is still loading, render nothing to avoid a flash redirect
  if (!user) return null
  if (!user.is_admin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminPageWrapper() {
  const navigate = useNavigate()
  return <AdminPage onExit={() => navigate('/')} />
}

export default function App() {
  const loadMe = useAuthStore((s) => s.loadMe)

  useEffect(() => {
    loadMe()
  }, [loadMe])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPageWrapper />
            </RequireAdmin>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
