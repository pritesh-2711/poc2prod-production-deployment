"""Compatibility import for the intersession memory job."""

from .tasks.intersession_memory import run_intersession_memory_job

__all__ = ["run_intersession_memory_job"]
