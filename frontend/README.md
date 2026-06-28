# Chat Assistant UI

React + TypeScript frontend for the research paper chat assistant backend.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| State | Zustand |
| Markdown | react-markdown + remark-gfm |
| Diagrams | Mermaid.js |
| Styling | Custom dark theme (CSS Modules + global CSS variables) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server proxies `/api/*`
to the FastAPI backend at `localhost:8000` (configured in `vite.config.ts`).

## Features

### Auth

- Sign up / sign in with email + password (JWT)
- Admin-gated accounts — new signups are `pending` until approved via SQL

### Sessions

- Create, rename, and delete chat sessions
- Session history listed in sidebar
- Messages load on session select and persist across refresh

### Chat

- SSE streaming for token-level response display with per-node status messages
- Four execution modes selectable from the input bar:
  - **Workflows → Fast** — low-latency deterministic RAG
  - **Workflows → Deep** — intent analysis, optional clarification, validation loop
  - **Agents → Single RAG Agent** — one agent with all tools
  - **Agents → Supervisor Agent** — supervisor + five specialist workers
- File upload (PDF / DOCX) attached to the active session

### Response feedback

- Thumbs up / thumbs down buttons appear below every persisted assistant message
- Clicking a thumb immediately highlights it (optimistic UI) and calls `POST /sessions/{id}/messages/{chat_id}/feedback`
- Rating is stored per `chatId` in Zustand `chatStore.feedbackState`; the highlight persists for the session
- On API failure the highlight rolls back
- The backend attributes the rating to the retrieved chunks that produced the response (RLHF-lite)

### Chart rendering (E2B PNG)

- `analyse` tool responses include base64 PNG charts captured from E2B sandbox
- Charts are displayed inline below the assistant message
- Hover over a chart to reveal **copy image** and **download PNG** icon buttons
- Charts are persisted in `orchestrator_metadata` JSONB and restored on session reload

### Mermaid diagram rendering

- LLM responses containing ` ```mermaid ``` ` code blocks are rendered as
  interactive SVGs by Mermaid.js — the user sees the diagram, not the code
- Diagrams are validated server-side before reaching the frontend; invalid blocks
  are silently removed rather than displayed as error boxes
- Hover over a diagram to reveal **copy Mermaid code** and **download SVG** icon buttons
- Messages containing diagrams or charts automatically expand to 92% bubble width
  for better readability

### Input area

- Auto-resizing textarea (up to 180 px) with no scroll jump on resize
- Spellcheck, autocomplete, autocorrect, and autocapitalize disabled
- Single Ctrl+C / Enter to send; Shift+Enter for newline

## Project Structure

```text
src/
├── api/
│   └── client.ts          # Typed API client; chatApi.streamMessage yields StreamEvent
├── store/
│   ├── authStore.ts        # Zustand auth state (JWT, user record)
│   ├── chatStore.ts        # Zustand chat state (sessions, messages, streaming)
│   └── documentsStore.ts   # Zustand upload state
├── types/
│   └── api.ts              # Shared TypeScript interfaces (ChatMessageResponse, etc.)
├── components/
│   ├── ChatArea.tsx        # Input bar + message list + mode toggles
│   ├── MessageBubble.tsx   # Renders one message (text + charts + ChartCard)
│   ├── MessageBubble.module.css
│   └── chat/
│       └── MermaidDiagram.tsx   # Mermaid.js renderer with copy/download actions
├── styles/
│   └── global.css          # CSS custom properties (theme) + markdown content styles
└── pages/
    ├── SignIn.tsx
    ├── SignUp.tsx
    └── Chat.tsx
```

## API Contract

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/auth/signup` | Register new user |
| POST | `/auth/signin` | Login, returns JWT |
| POST | `/auth/signout` | Logout |
| GET | `/auth/me` | Current user info |
| GET | `/sessions` | List user sessions |
| POST | `/sessions` | Create new session |
| DELETE | `/sessions/:id` | Delete session |
| POST | `/sessions/:id/terminate` | Mark session inactive |
| GET | `/sessions/:id/messages` | Fetch full message history (includes charts) |
| POST | `/sessions/:id/messages` | Send a message (non-streaming) |
| POST | `/sessions/:id/messages/stream` | Send a message (SSE streaming) |
| POST | `/sessions/:id/messages/:chat_id/feedback` | Submit thumbs up/down for an assistant message |
| POST | `/sessions/:id/upload` | Upload PDF or DOCX |
| GET | `/sessions/:id/documents` | List ingested documents |

### SSE event types (streaming)

| Event type | Payload |
| ---------- | ------- |
| `user_message` | Persisted user `ChatMessageResponse` |
| `status` | `{ content: string }` — current graph node label |
| `token` | `{ content: string }` — one LLM token chunk |
| `clarification` | `{ content: string }` — deep-mode HITL question |
| `done` | Full `ChatMessageResponse` including `charts: string[]` |
| `error` | `{ detail: string }` |

## Still to address

- [ ] Model selector (Ollama / OpenAI toggle in UI)
- [ ] Agent evaluation / analytics panel
