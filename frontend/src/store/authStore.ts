import { create } from 'zustand'
import { authApi } from '../api/client'
import type { UserResponse } from '../types/api'

interface AuthState {
  user: UserResponse | null
  token: string | null
  loading: boolean
  error: string | null
  signin: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  signout: () => Promise<void>
  loadMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  signin: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const tokenRes = await authApi.signin({ email, password })
      localStorage.setItem('access_token', tokenRes.access_token)
      const user = await authApi.me()
      set({ token: tokenRes.access_token, user, loading: false })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true, error: null })
    try {
      await authApi.signup({ name, email, password })
      const tokenRes = await authApi.signin({ email, password })
      localStorage.setItem('access_token', tokenRes.access_token)
      const user = await authApi.me()
      set({ token: tokenRes.access_token, user, loading: false })
    } catch (e) {
      set({ loading: false, error: (e as Error).message })
    }
  },

  signout: async () => {
    try {
      await authApi.signout()
    } catch {
      // best-effort
    }
    localStorage.removeItem('access_token')
    set({ user: null, token: null })
  },

  loadMe: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    set({ loading: true })
    try {
      const user = await authApi.me()
      set({ user, token, loading: false })
    } catch {
      localStorage.removeItem('access_token')
      set({ user: null, token: null, loading: false })
    }
  },
}))