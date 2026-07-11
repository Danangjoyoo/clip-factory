"""Process entrypoint for the Temporal worker."""

import asyncio
import os

from temporalio.client import Client

from clip_factory.composition.settings import WorkerSettings
from clip_factory.entrypoints.temporal.worker import build_worker


async def run_worker() -> None:
    settings = WorkerSettings.from_env()
    client = await Client.connect(settings.temporal_address)
    worker = build_worker(client, os.environ.get("TEMPORAL_TASK_QUEUE", "clip-factory"))
    await worker.run()


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
