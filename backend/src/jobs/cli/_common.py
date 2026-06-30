"""Shared CLI helpers for one-shot jobs."""

import argparse
import asyncio
import logging
import os


def configure_logging() -> None:
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def add_common_args(parser: argparse.ArgumentParser, *, batch_size: bool = False) -> None:
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=None,
        help="Run read/evaluation steps without committing database writes.",
    )
    if batch_size:
        parser.add_argument(
            "--batch-size",
            type=int,
            default=None,
            help="Maximum number of candidate records to process.",
        )


def run_job(job_name: str, coro) -> int:
    configure_logging()
    try:
        asyncio.run(coro)
        return 0
    except Exception:
        logging.getLogger(__name__).exception("%s failed", job_name)
        return 1
