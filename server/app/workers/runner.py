"""
Run orchestrator entrypoint.

Will contain:
- the end-to-end pipeline for a run:
  ingestion -> mapping -> test generation/refactor -> execution -> scoring

Initially may run in-process (BackgroundTasks); later can be moved to a queue.
"""

