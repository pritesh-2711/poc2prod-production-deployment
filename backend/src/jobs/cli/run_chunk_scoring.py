"""Run the chunk scoring job once."""

import argparse
import sys

from src.jobs.cli._common import add_common_args, run_job
from src.jobs.tasks.chunk_scoring import run_chunk_scoring_job


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run chunk scoring once.")
    add_common_args(parser)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return run_job(
        "Chunk scoring job",
        run_chunk_scoring_job(dry_run=args.dry_run),
    )


if __name__ == "__main__":
    sys.exit(main())
