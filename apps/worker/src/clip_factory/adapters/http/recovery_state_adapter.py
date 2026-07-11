class RecoveryStateAdapter:
    def __init__(self, client: object) -> None:
        self.client = client

    async def rebuild(self, project_id: str, events: list[dict]) -> None:
        await self.client.rebuild(project_id, events)

    async def mark_offline(self, project_id: str) -> None:
        await self.client.mark_offline(project_id)
