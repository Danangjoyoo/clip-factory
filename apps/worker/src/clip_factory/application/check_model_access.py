from clip_factory.ports.model_access import ModelAccessPort, ModelAccessResult


class CheckModelAccess:
    def __init__(self, port: ModelAccessPort) -> None:
        self._port = port

    async def execute(self, model_id: str) -> ModelAccessResult:
        if not model_id.strip():
            raise ValueError("model id is required")
        return await self._port.check(model_id)
