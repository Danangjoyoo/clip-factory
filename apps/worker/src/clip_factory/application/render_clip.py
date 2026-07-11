from __future__ import annotations

import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from clip_factory.adapters.media.ass_compiler import compile_ass
from clip_factory.adapters.media.source_media_lease import SourceMediaLease
from clip_factory.domain.render import RenderSnapshot, artifact_key, validate_output
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.render_engine import RenderEngine


class RenderArtifactStore(Protocol):
    async def put_file(self, key: str, path: Path) -> Any: ...


class RenderProbe(Protocol):
    async def probe(self, path: Path) -> Any: ...


@dataclass(frozen=True)
class RenderCommand:
    project_id: str
    snapshot: RenderSnapshot
    locator: Any


class RenderClip:
    def __init__(
        self,
        lease_factory: Any,
        engine: RenderEngine,
        probe: RenderProbe,
        artifacts: RenderArtifactStore,
    ) -> None:
        self._lease_factory = lease_factory
        self._engine = engine
        self._probe = probe
        self._artifacts = artifacts

    async def execute(self, command: RenderCommand) -> Any:
        snapshot = command.snapshot
        lease: SourceMediaLease = self._lease_factory(command.locator)
        with tempfile.TemporaryDirectory(prefix="clip-render-") as workspace_name:
            workspace = Path(workspace_name)
            ass_path = workspace / "captions.ass"
            output_path = workspace / "output.mp4"
            ass_path.write_text(compile_ass(snapshot.spec), encoding="utf-8")
            async with lease as source_path:
                await self._engine.render(snapshot.spec, source_path, ass_path, output_path)
            output_probe = await self._probe.probe(output_path)
            validate_output(output_probe, snapshot.spec.range_ms[1] - snapshot.spec.range_ms[0])
            return await self._artifacts.put_file(
                artifact_key(command.project_id, snapshot.spec.clip_id, snapshot.spec.render_id),
                output_path,
            )
