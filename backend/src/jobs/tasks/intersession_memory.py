"""One-shot intersession memory job."""

import logging
import time
import uuid

from ...core.models import IntersessionConfig
from ._runtime import (
    build_chat_service,
    build_config,
    build_embedder,
    build_intersession_repo,
    job_batch_size,
    job_dry_run,
)

logger = logging.getLogger(__name__)

_SUMMARY_SYSTEM = (
    "You are a helpful assistant that creates concise conversation summaries."
)

_SUMMARY_PROMPT = """\
Summarise the following conversation between a user and an AI assistant in 3-5 sentences.
Focus on the main topics discussed, questions asked, and key conclusions reached.
Keep it factual and concise - this summary will provide background context in future sessions.

Conversation:
{history}

Summary:"""

_MAX_HISTORY_CHARS = 16_000


async def run_intersession_memory_job(
    *,
    intersession_repo=None,
    chat_service=None,
    embedder=None,
    intersession_config: IntersessionConfig | None = None,
    dry_run: bool | None = None,
    smoke_test: bool = False,
    batch_size: int | None = None,
) -> dict:
    """Summarise sessions once and upsert summary embeddings."""
    started = time.monotonic()
    dry_run_enabled = job_dry_run(dry_run)
    limit = job_batch_size(batch_size)

    logger.info(
        "Intersession memory job started",
        extra={"dry_run": dry_run_enabled, "smoke_test": smoke_test},
    )

    config = None
    if intersession_repo is None or chat_service is None or embedder is None or intersession_config is None:
        config = build_config()
    intersession_config = intersession_config or config.jobs_config.intersession

    if smoke_test:
        duration = time.monotonic() - started
        logger.info(
            "Intersession memory smoke test passed. "
            "No database, LLM, embedding, or external service calls were made.",
            extra={"duration_seconds": round(duration, 3)},
        )
        return {"processed": 0, "skipped": 0, "failed": 0, "duration_seconds": duration}

    if not intersession_config.enabled:
        duration = time.monotonic() - started
        logger.info(
            "Intersession memory job skipped",
            extra={"status": "disabled", "duration_seconds": round(duration, 3)},
        )
        return {"processed": 0, "skipped": 0, "failed": 0, "duration_seconds": duration}

    intersession_repo = intersession_repo or build_intersession_repo(config)
    if not dry_run_enabled:
        chat_service = chat_service or build_chat_service(config)
        embedder = embedder or build_embedder(config)

    sessions = await intersession_repo.get_sessions_for_summary()
    input_count = len(sessions)
    candidates = sessions[:limit] if limit else sessions

    logger.info(
        "Intersession memory candidates loaded",
        extra={
            "input_count": input_count,
            "candidate_count": len(candidates),
            "dry_run": dry_run_enabled,
            "batch_size": limit,
        },
    )

    processed = 0
    skipped = 0
    failed = 0

    for entry in candidates:
        session_id = uuid.UUID(entry["session_id"])
        user_id = uuid.UUID(entry["user_id"])

        try:
            history_text = await intersession_repo.get_session_chat_history_text(session_id)
            if not history_text.strip():
                skipped += 1
                continue

            if dry_run_enabled:
                skipped += 1
                continue

            if len(history_text) > _MAX_HISTORY_CHARS:
                history_text = history_text[-_MAX_HISTORY_CHARS:]

            prompt = _SUMMARY_PROMPT.format(history=history_text)
            summary = await chat_service.llm_provider.achat(
                user_message=prompt,
                system_prompt=_SUMMARY_SYSTEM,
            )
            summary = summary.strip()
            if not summary:
                skipped += 1
                continue

            token_count = len(summary) // 4
            embedding = embedder.embed_one(summary)

            await intersession_repo.upsert_session_summary(
                user_id=user_id,
                session_id=session_id,
                summary_text=summary,
                embedding=embedding,
                token_count=token_count,
            )
            processed += 1
            logger.debug("[intersession_memory] summarised session %s", session_id)

        except Exception as exc:
            failed += 1
            logger.error(
                "[intersession_memory] failed for session %s: %s",
                session_id,
                exc,
                exc_info=True,
            )

    duration = time.monotonic() - started
    logger.info(
        "Intersession memory job completed",
        extra={
            "input_count": input_count,
            "candidate_count": len(candidates),
            "processed": processed,
            "skipped": skipped,
            "failed": failed,
            "duration_seconds": round(duration, 3),
            "dry_run": dry_run_enabled,
        },
    )

    if dry_run_enabled:
        logger.info("Dry run enabled. No database writes were committed.")

    if failed:
        raise RuntimeError(f"Intersession memory job failed for {failed} sessions")

    return {
        "processed": processed,
        "skipped": skipped,
        "failed": failed,
        "duration_seconds": duration,
    }
