import { create } from 'zustand'
import { documentsApi } from '../api/client'
import type { DocumentRecord } from '../types/api'

// Per-file upload entry shown in the drive panel
export interface UploadEntry {
  id: string              // random id for react keys
  filename: string
  status: 'uploading' | 'processing' | 'done' | 'error'
  error?: string
  result?: DocumentRecord // populated when status === 'done'
}

interface DocumentsState {
  // Map of sessionId → list of ingested documents (fetched from backend)
  docsBySession: Record<string, DocumentRecord[]>
  // Uploads in-flight or recently completed for the active session
  uploads: UploadEntry[]
  driveOpen: boolean

  openDrive: () => void
  closeDrive: () => void
  toggleDrive: () => void

  loadDocuments: (sessionId: string) => Promise<void>
  uploadFile: (sessionId: string, file: File, description?: string) => Promise<void>
  clearUploads: () => void
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  docsBySession: {},
  uploads: [],
  driveOpen: false,

  openDrive: () => set({ driveOpen: true }),
  closeDrive: () => set({ driveOpen: false }),
  toggleDrive: () => set((s) => ({ driveOpen: !s.driveOpen })),

  clearUploads: () => set({ uploads: [] }),

  loadDocuments: async (sessionId) => {
    try {
      const docs = await documentsApi.list(sessionId)
      set((s) => ({
        docsBySession: { ...s.docsBySession, [sessionId]: docs },
      }))
    } catch {
      // non-fatal — drive will just show empty
    }
  },

  uploadFile: async (sessionId, file, description = '') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Add entry in uploading state and open the drive panel
    set((s) => ({
      driveOpen: true,
      uploads: [
        { id, filename: file.name, status: 'uploading' },
        ...s.uploads,
      ],
    }))

    try {
      // Mark as processing while the server runs extract→chunk→embed→insert
      set((s) => ({
        uploads: s.uploads.map((u) =>
          u.id === id ? { ...u, status: 'processing' } : u,
        ),
      }))

      const result = await documentsApi.upload(sessionId, file, description)

      const doc: DocumentRecord = {
        filename: result.filename,
        file_description: result.file_description,
        file_type: result.content_type.includes('pdf') ? 'pdf' : 'doc',
        parent_chunks: result.parent_chunks,
        child_chunks: result.child_chunks,
        ingested_at: new Date().toISOString(),
      }

      // Mark done + refresh the session document list
      set((s) => ({
        uploads: s.uploads.map((u) =>
          u.id === id ? { ...u, status: 'done', result: doc } : u,
        ),
      }))

      await get().loadDocuments(sessionId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      set((s) => ({
        uploads: s.uploads.map((u) =>
          u.id === id ? { ...u, status: 'error', error: msg } : u,
        ),
      }))
    }
  },
}))
