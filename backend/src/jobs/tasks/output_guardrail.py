"""One-shot output guardrail job."""

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from ._runtime import build_admin_repo, build_config, job_batch_size, job_dry_run

logger = logging.getLogger(__name__)

_TOXICITY_THRESHOLD = 0.5
_BIAS_THRESHOLD = 0.5


async def _evaluate_message(
    message: str,
    user_input: Optional[str],
    evaluator_model: str,
) -> tuple[float, float, Optional[float]]:
    """Run DeepEval metrics on a single assistant message."""
    from deepeval.metrics import BiasMetric, ToxicityMetric
    from deepeval.test_case import LLMTestCase

    input_text = user_input or message
    test_case = LLMTestCase(input=input_text, actual_output=message)

    toxicity_metric = ToxicityMetric(
        model=evaluator_model,
        threshold=_TOXICITY_THRESHOLD,
        async_mode=True,
        include_reason=False,
    )
    bias_metric = BiasMetric(
        model=evaluator_model,
        threshold=_BIAS_THRESHOLD,
        async_mode=True,
        include_reason=False,
    )

    results = await asyncio.gather(
        toxicity_metric.a_measure(test_case),
        bias_metric.a_measure(test_case),
        return_exceptions=True,
    )

    toxicity_score = 0.0
    bias_score = 0.0

    if not isinstance(results[0], Exception):
        toxicity_score = float(toxicity_metric.score or 0.0)
    else:
        logger.warning("[output_guardrail] ToxicityMetric error: %s", results[0])

    if not isinstance(results[1], Exception):
        bias_score = float(bias_metric.score or 0.0)
    else:
        logger.warning("[output_guardrail] BiasMetric error: %s", results[1])

    return toxicity_score, bias_score, None


async def run_output_guardrail_job(
    *,
    admin_repo=None,
    guardrails_config=None,
    job_history: dict | None = None,
    window_hours: int = 24,
    dry_run: bool | None = None,
    batch_size: int | None = None,
) -> dict:
    """Evaluate recent unprocessed assistant messages once."""
    job_id = "output_guardrail"
    wall_started = datetime.now(timezone.utc)
    started = time.monotonic()
    dry_run_enabled = job_dry_run(dry_run)
    limit = job_batch_size(batch_size)
    job_history = job_history if job_history is not None else {}

    config = None
    if admin_repo is None or guardrails_config is None:
        config = build_config()
    guardrails_config = guardrails_config or config.guardrails_config

    processed = 0
    skipped = 0
    failed = 0
    flagged = 0

    try:
        if not guardrails_config.enabled:
            duration = time.monotonic() - started
            logger.info(
                "Output guardrail job skipped",
                extra={"status": "disabled", "duration_seconds": round(duration, 3)},
            )
            job_history[job_id] = {
                "last_run": wall_started.isoformat(),
                "status": "skipped",
                "detail": "guardrails disabled",
            }
            return {"processed": 0, "skipped": 0, "failed": 0, "duration_seconds": duration}

        admin_repo = admin_repo or build_admin_repo(config)
        messages = await admin_repo.get_unprocessed_assistant_messages(
            window_hours=window_hours,
            limit=limit,
        )
        input_count = len(messages)

        logger.info(
            "Output guardrail job started",
            extra={
                "input_count": input_count,
                "candidate_count": input_count,
                "dry_run": dry_run_enabled,
                "batch_size": limit,
            },
        )

        if dry_run_enabled:
            duration = time.monotonic() - started
            skipped = input_count
            logger.info(
                "Output guardrail job completed",
                extra={
                    "input_count": input_count,
                    "candidate_count": input_count,
                    "processed": 0,
                    "skipped": skipped,
                    "failed": 0,
                    "flagged": 0,
                    "duration_seconds": round(duration, 3),
                    "dry_run": True,
                },
            )
            logger.info("Dry run enabled. No database writes were committed.")
            job_history[job_id] = {
                "last_run": wall_started.isoformat(),
                "status": "succeeded",
                "detail": f"dry_run=true, candidates={input_count}",
            }
            return {
                "processed": 0,
                "skipped": skipped,
                "failed": 0,
                "duration_seconds": duration,
            }

        evaluator_model = guardrails_config.evaluator_model

        for msg in messages:
            chat_id = uuid.UUID(msg["chat_id"])
            session_id = uuid.UUID(msg["session_id"])

            try:
                user_input = await admin_repo.get_preceding_user_message(
                    session_id=session_id,
                    before_iso=msg["created_at"],
                )

                toxicity, bias, faithfulness = await _evaluate_message(
                    message=msg["message"],
                    user_input=user_input,
                    evaluator_model=evaluator_model,
                )

                is_flagged = toxicity > _TOXICITY_THRESHOLD or bias > _BIAS_THRESHOLD
                reasons = []
                if toxicity > _TOXICITY_THRESHOLD:
                    reasons.append(f"toxicity {toxicity:.2f}")
                if bias > _BIAS_THRESHOLD:
                    reasons.append(f"bias {bias:.2f}")
                flag_reason = "; ".join(reasons) if reasons else None

                await admin_repo.upsert_governance_flag(
                    chat_id=chat_id,
                    session_id=session_id,
                    toxicity_score=toxicity,
                    bias_score=bias,
                    faithfulness_score=faithfulness,
                    flagged=is_flagged,
                    flag_reason=flag_reason,
                )

                processed += 1
                if is_flagged:
                    flagged += 1
                    logger.warning(
                        "[output_guardrail] flagged chat %s: %s",
                        chat_id,
                        flag_reason,
                    )

            except Exception as exc:
                failed += 1
                logger.error(
                    "[output_guardrail] failed for chat %s: %s",
                    chat_id,
                    exc,
                    exc_info=True,
                )

        duration = time.monotonic() - started
        detail = f"processed={processed}, skipped={skipped}, failed={failed}, flagged={flagged}"
        logger.info(
            "Output guardrail job completed",
            extra={
                "input_count": input_count,
                "candidate_count": input_count,
                "processed": processed,
                "skipped": skipped,
                "failed": failed,
                "flagged": flagged,
                "duration_seconds": round(duration, 3),
                "dry_run": False,
            },
        )
        job_history[job_id] = {
            "last_run": wall_started.isoformat(),
            "status": "succeeded" if failed == 0 else "failed",
            "detail": detail,
        }

        if failed:
            raise RuntimeError(f"Output guardrail job failed for {failed} messages")

        return {
            "processed": processed,
            "skipped": skipped,
            "failed": failed,
            "duration_seconds": duration,
        }

    except Exception as exc:
        logger.error("[output_guardrail] job failed: %s", exc, exc_info=True)
        job_history[job_id] = {
            "last_run": wall_started.isoformat(),
            "status": "failed",
            "detail": str(exc),
        }
        raise
