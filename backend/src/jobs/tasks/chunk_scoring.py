"""One-shot RLHF chunk scoring job."""

import logging
import time

from ._runtime import build_config, build_intersession_repo, job_dry_run

logger = logging.getLogger(__name__)


async def run_chunk_scoring_job(
    *,
    intersession_repo=None,
    dry_run: bool | None = None,
) -> dict:
    """Recompute chunk quality scores once."""
    started = time.monotonic()
    dry_run_enabled = job_dry_run(dry_run)

    logger.info("Chunk scoring job started", extra={"dry_run": dry_run_enabled})

    if dry_run_enabled:
        duration = time.monotonic() - started
        logger.info(
            "Chunk scoring job completed",
            extra={
                "input_count": 0,
                "candidate_count": 0,
                "processed": 0,
                "skipped": 0,
                "failed": 0,
                "duration_seconds": round(duration, 3),
                "dry_run": True,
            },
        )
        logger.info("Dry run enabled. No database writes were committed.")
        return {"processed": 0, "skipped": 0, "failed": 0, "duration_seconds": duration}

    config = None
    if intersession_repo is None:
        config = build_config()
    intersession_repo = intersession_repo or build_intersession_repo(config)

    updated = await intersession_repo.recompute_chunk_scores()
    duration = time.monotonic() - started
    logger.info(
        "Chunk scoring job completed",
        extra={
            "input_count": updated,
            "candidate_count": updated,
            "processed": updated,
            "skipped": 0,
            "failed": 0,
            "duration_seconds": round(duration, 3),
            "dry_run": False,
        },
    )
    return {"processed": updated, "skipped": 0, "failed": 0, "duration_seconds": duration}
