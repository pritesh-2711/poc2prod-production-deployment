import { useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { useDocumentsStore, type UploadEntry } from '../../store/documentsStore';
import type { DocumentRecord } from '../../types/api';

interface PersonalDriveProps {
  sessionId: string | null;
}

export function PersonalDrive({ sessionId }: PersonalDriveProps) {
  const { docsBySession, uploads, driveOpen, closeDrive, loadDocuments } =
    useDocumentsStore();

  const docs: DocumentRecord[] = sessionId ? (docsBySession[sessionId] ?? []) : [];

  // Fetch documents when the panel opens or the session changes
  useEffect(() => {
    if (driveOpen && sessionId) {
      void loadDocuments(sessionId);
    }
  }, [driveOpen, sessionId, loadDocuments]);

  if (!driveOpen) return null;

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col bg-surface-overlay border-l border-surface-border h-full animate-slide-up">
      {/* Header */}
      <div className="px-4 py-4 border-b border-surface-border flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
          <HardDrive size={13} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ink-primary font-semibold text-sm">My Personal Drive</p>
          <p className="text-ink-muted text-xs">
            {sessionId ? 'Documents for this session' : 'Select a session'}
          </p>
        </div>
        <button
          onClick={closeDrive}
          className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-card transition-all flex-shrink-0"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Active uploads */}
      {uploads.length > 0 && (
        <div className="px-3 pt-3 space-y-2">
          <p className="text-ink-muted text-xs font-medium uppercase tracking-wide px-1 mb-1">
            Uploads
          </p>
          {uploads.map((u) => (
            <UploadItem key={u.id} entry={u} />
          ))}
        </div>
      )}

      {/* Divider when both sections present */}
      {uploads.length > 0 && docs.length > 0 && (
        <div className="mx-3 mt-3 border-t border-surface-border" />
      )}

      {/* Ingested documents */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!sessionId ? (
          <EmptyHint message="No session open" />
        ) : docs.length === 0 && uploads.length === 0 ? (
          <EmptyHint message="No documents yet — upload a PDF or DOCX to get started" />
        ) : docs.length > 0 ? (
          <>
            <p className="text-ink-muted text-xs font-medium uppercase tracking-wide px-1 mb-2">
              Ingested ({docs.length})
            </p>
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocItem key={doc.filename} doc={doc} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UploadItem({ entry }: { entry: UploadEntry }) {
  const isActive = entry.status === 'uploading' || entry.status === 'processing';
  const label =
    entry.status === 'uploading'
      ? 'Uploading…'
      : entry.status === 'processing'
        ? 'Extracting & indexing…'
        : entry.status === 'done'
          ? 'Ingested'
          : 'Failed';

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        entry.status === 'error'
          ? 'border-danger/30 bg-danger/5'
          : entry.status === 'done'
            ? 'border-success/30 bg-success/5'
            : 'border-surface-border bg-surface-card'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">
          {isActive && <Loader2 size={13} className="animate-spin text-brand" />}
          {entry.status === 'done' && <CheckCircle2 size={13} className="text-success" />}
          {entry.status === 'error' && <AlertCircle size={13} className="text-danger" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-ink-primary text-xs font-medium truncate">{entry.filename}</p>
          <p
            className={`text-xs mt-0.5 ${
              entry.status === 'error'
                ? 'text-danger'
                : entry.status === 'done'
                  ? 'text-success'
                  : 'text-ink-muted'
            }`}
          >
            {entry.status === 'error' ? entry.error : label}
          </p>

          {/* Indeterminate progress bar for active uploads */}
          {isActive && (
            <div className="mt-1.5 h-1 rounded-full bg-surface-border overflow-hidden">
              <div className="h-full rounded-full bg-brand animate-pulse w-2/3" />
            </div>
          )}

          {/* Chunk counts on success */}
          {entry.status === 'done' && entry.result && (
            <p className="text-ink-muted text-xs mt-0.5">
              {entry.result.child_chunks} chunks indexed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DocItem({ doc }: { doc: DocumentRecord }) {
  const uploadedAt = new Date(doc.ingested_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 hover:border-brand/30 transition-all group">
      <div className="flex items-start gap-2.5">
        <FileText size={13} className="mt-0.5 flex-shrink-0 text-ink-muted group-hover:text-brand transition-colors" />
        <div className="flex-1 min-w-0">
          <p className="text-ink-primary text-xs font-medium truncate">{doc.filename}</p>
          {doc.file_description && (
            <p className="text-ink-muted text-xs truncate mt-0.5">{doc.file_description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-ink-muted text-xs">{doc.child_chunks} chunks</span>
            <span className="text-ink-muted text-xs">·</span>
            <span className="text-ink-muted text-xs">{uploadedAt}</span>
          </div>
        </div>
        <span className="text-ink-muted text-xs flex-shrink-0 uppercase font-medium">
          {doc.file_type}
        </span>
      </div>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
      <HardDrive size={24} className="text-ink-muted mb-3 opacity-50" />
      <p className="text-ink-muted text-xs leading-relaxed">{message}</p>
    </div>
  );
}
