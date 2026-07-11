from dataclasses import dataclass
from clip_factory.ports.cleanup_store import CleanupStore


@dataclass
class CleanupJob:
    store: CleanupStore
    async def execute(self, project_id: str, temporary_keys: list[str], upload_ids: list[str]) -> None:
        safe = [k for k in temporary_keys if k.startswith(f"projects/{project_id}/tmp/")]
        for upload_id in upload_ids:
            await self.store.abort_multipart(upload_id)
        await self.store.delete_project_temporary(project_id, safe)
