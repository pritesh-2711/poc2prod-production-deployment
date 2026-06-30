"""Compatibility import for the chunk scoring job."""

from .tasks.chunk_scoring import run_chunk_scoring_job

__all__ = ["run_chunk_scoring_job"]
