"""API tests for chat PII redaction boundaries."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.chat import router as chat_router
from src.api.deps import (
    get_current_user,
    get_embedder,
    get_orchestrator,
    get_pending_clarifications,
    get_pii_redactor,
    get_repo,
)
from src.core.models import ChatRecord, UserRecord
from src.guardrails.redaction import BasePIIRedactor, RedactionResult


TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
TEST_SESSION_ID = UUID("00000000-0000-0000-0000-000000000002")
TEST_CHAT_ID = UUID("00000000-0000-0000-0000-000000000003")


class FakePIIRedactor(BasePIIRedactor):
    """Simple deterministic redactor for API boundary tests."""

    def redact(self, text: str) -> RedactionResult:
        redacted = text
        for pii in ("alice@example.com", "bob@example.com", "555-123-4567"):
            redacted = redacted.replace(pii, "*************")
        return RedactionResult(text=redacted, changed=redacted != text)


def _user() -> UserRecord:
    return UserRecord(
        user_id=TEST_USER_ID,
        name="Test User",
        email="test@example.com",
        created_at=datetime(2024, 1, 1, 12, 0, 0),
    )


def _record(session_id: UUID, sender: str, message: str) -> ChatRecord:
    return ChatRecord(
        chat_id=uuid4(),
        session_id=session_id,
        sender=sender,
        message=message,
        created_at=datetime(2024, 1, 1, 12, 0, 0),
    )


def _chat_client(repo, embedder, orchestrator, pending=None) -> TestClient:
    app = FastAPI()
    app.include_router(chat_router)
    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[get_embedder] = lambda: embedder
    app.dependency_overrides[get_orchestrator] = lambda: orchestrator
    app.dependency_overrides[get_pending_clarifications] = lambda: pending or {}
    app.dependency_overrides[get_pii_redactor] = FakePIIRedactor
    return TestClient(app, raise_server_exceptions=False)


def _repo_with_add_message() -> MagicMock:
    repo = MagicMock()

    def add_message(**kwargs):
        return _record(
            session_id=kwargs["session_id"],
            sender=kwargs["sender"],
            message=kwargs["message"],
        )

    repo.add_message.side_effect = add_message
    return repo


def _embedder() -> MagicMock:
    embedder = MagicMock()
    embedder.embed_query.return_value = [0.1, 0.2]
    embedder.embed_one.return_value = [0.3, 0.4]
    return embedder


def test_send_message_redacts_user_and_assistant_text_before_storage_and_response() -> None:
    repo = _repo_with_add_message()
    embedder = _embedder()
    orchestrator = MagicMock()
    orchestrator.chat_service = MagicMock()
    orchestrator.ainvoke = AsyncMock(
        return_value={
            "final_response": "I will contact bob@example.com.",
            "charts": [],
        }
    )
    orchestrator.ais_interrupted = AsyncMock(return_value=False)

    client = _chat_client(repo, embedder, orchestrator)
    resp = client.post(
        f"/sessions/{TEST_SESSION_ID}/messages",
        json={"message": "Please email alice@example.com", "category": "workflow", "variant": "fast"},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["user_message"]["message"] == "Please email *************"
    assert data["assistant_message"]["message"] == "I will contact *************."

    embedder.embed_query.assert_called_once_with("Please email *************")
    embedder.embed_one.assert_called_once_with("I will contact *************.")
    initial_state = orchestrator.ainvoke.call_args.args[0]
    assert initial_state["original_query"] == "Please email *************"
    saved_messages = [call.kwargs["message"] for call in repo.add_message.call_args_list]
    assert "alice@example.com" not in " ".join(saved_messages)
    assert "bob@example.com" not in " ".join(saved_messages)


def test_send_message_redacts_clarification_before_storage_and_response() -> None:
    repo = _repo_with_add_message()
    embedder = _embedder()
    orchestrator = MagicMock()
    orchestrator.chat_service = MagicMock()
    orchestrator.ainvoke = AsyncMock(
        return_value={
            "clarification_question": "Should I use alice@example.com?",
            "charts": [],
        }
    )
    orchestrator.ais_interrupted = AsyncMock(return_value=True)

    client = _chat_client(repo, embedder, orchestrator)
    resp = client.post(
        f"/sessions/{TEST_SESSION_ID}/messages",
        json={"message": "Draft a reply for bob@example.com", "category": "workflow", "variant": "deep"},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["user_message"]["message"] == "Draft a reply for *************"
    assert data["assistant_message"]["message"] == "Should I use *************?"
    saved_messages = [call.kwargs["message"] for call in repo.add_message.call_args_list]
    assert "alice@example.com" not in " ".join(saved_messages)
    assert "bob@example.com" not in " ".join(saved_messages)


def test_feedback_comment_is_redacted_before_saving() -> None:
    repo = MagicMock()
    repo.save_feedback.return_value = UUID("00000000-0000-0000-0000-000000000004")
    embedder = _embedder()
    orchestrator = MagicMock()

    client = _chat_client(repo, embedder, orchestrator)
    resp = client.post(
        f"/sessions/{TEST_SESSION_ID}/messages/{TEST_CHAT_ID}/feedback",
        json={"rating": "down", "comment": "This exposed 555-123-4567"},
    )

    assert resp.status_code == 201
    repo.save_feedback.assert_called_once()
    assert repo.save_feedback.call_args.kwargs["comment"] == "This exposed *************"
