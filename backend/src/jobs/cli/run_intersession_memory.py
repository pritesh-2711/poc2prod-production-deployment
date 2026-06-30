"""Run the intersession memory job once."""

import argparse
import sys

from src.jobs.cli._common import add_common_args, run_job
from src.jobs.tasks.intersession_memory import run_intersession_memory_job


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run intersession memory once.")
    add_common_args(parser, batch_size=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return run_job(
        "Intersession memory job",
        run_intersession_memory_job(
            dry_run=args.dry_run,
            smoke_test=args.smoke_test,
            batch_size=args.batch_size,
        ),
    )


if __name__ == "__main__":
    sys.exit(main())
