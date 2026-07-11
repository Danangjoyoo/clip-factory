import tempfile
from dataclasses import dataclass
from pathlib import Path

from clip_factory.domain.media import MediaProbe
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.artifact_store import ArtifactStorePort
from clip_factory.ports.preview_renderer import PreviewRendererPort
from clip_factory.ports.source_preprocessor import ObjectReference


@dataclass(frozen=True)
class PreviewCommand:
    project_id: str
    clip_id: str
    render_spec: RenderSpec


@dataclass(frozen=True)
class PreviewArtifacts:
    preview: ObjectReference
    thumbnail: ObjectReference
    probe: MediaProbe


class GeneratePreview:
    def __init__(self, renderer: PreviewRendererPort, store: ArtifactStorePort) -> None:
        self._renderer, self._store = renderer, store

    async def execute(self, command: PreviewCommand) -> PreviewArtifacts:
        with tempfile.TemporaryDirectory(prefix="clip-preview-") as directory:
            root = Path(directory)
            preview_path, thumbnail_path = root / "preview.mp4", root / "thumbnail.jpg"
            probe = await self._renderer.render(
                command.render_spec, preview_path, 360, 640
            )
            await self._renderer.thumbnail(preview_path, thumbnail_path)
            prefix = f"projects/{command.project_id}/clips/{command.clip_id}"
            preview = await _put_file(
                self._store, f"{prefix}/preview.mp4", preview_path
            )
            thumbnail = await _put_file(
                self._store, f"{prefix}/thumbnail.jpg", thumbnail_path
            )
            return PreviewArtifacts(preview, thumbnail, probe)


async def _put_file(store: ArtifactStorePort, key: str, path: Path) -> ObjectReference:
    return await store.put_file(key, path)
