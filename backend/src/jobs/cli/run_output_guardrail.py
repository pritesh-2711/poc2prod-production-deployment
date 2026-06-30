"""Run the output guardrail job once."""

import argparse
import sys

from src.jobs.cli._common import add_common_args, run_job
from src.jobs.tasks.output_guardrail import run_output_guardrail_job


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run output guardrails once.")
    add_common_args(parser, batch_size=True)
    parser.add_argument(
        "--window-hours",
        type=int,
        default=24,
        help="Look back this many hours for unprocessed assistant messages.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return run_job(
        "Output guardrail job",
        run_output_guardrail_job(
            dry_run=args.dry_run,
            batch_size=args.batch_size,
            window_hours=args.window_hours,
        ),
    )


if __name__ == "__main__":
    sys.exit(main())
