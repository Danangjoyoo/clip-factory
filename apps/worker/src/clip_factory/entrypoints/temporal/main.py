"""Process entrypoint for the Temporal worker."""

import asyncio
import os

from temporalio.client import Client

from clip_factory.composition.settings import WorkerSettings
from clip_factory.entrypoints.temporal.worker import build_worker


async def _handle_health_connection(
    _reader: asyncio.StreamReader, writer: asyncio.StreamWriter
) -> None:
    writer.close()
    await writer.wait_closed()


async def start_health_server(port: int) -> asyncio.Server:
    return await asyncio.start_server(_handle_health_connection, "0.0.0.0", port)


async def run_worker() -> None:
    settings = WorkerSettings.from_env()
    client = await Client.connect(settings.temporal_address)
    worker = build_worker(client, os.environ.get("TEMPORAL_TASK_QUEUE", "clip-factory"))
    server = await start_health_server(
        int(os.environ.get("WORKER_HEALTH_PORT", "8001"))
    )
    try:
        await worker.run()
    finally:
        server.close()
        await server.wait_closed()


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
