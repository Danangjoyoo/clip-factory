from typing import Protocol


class CredentialVault(Protocol):
    async def contains(self, connection_id: str) -> bool: ...

    async def delete(self, connection_id: str) -> None: ...
