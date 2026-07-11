from dataclasses import dataclass
import hashlib
from pathlib import Path
import tempfile
from typing import Any

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
class PreviewResult:
    preview: ObjectReference
    thumbnail: ObjectReference
    probe: MediaProbe | None = None


class GeneratePreview:
    def __init__(self, renderer: PreviewRendererPort, store: ArtifactStorePort) -> None:
        self._renderer, self._store = renderer, store

    async def execute(self, command: PreviewCommand) -> PreviewResult:
        with tempfile.TemporaryDirectory(prefix="clip-preview-") as directory:
            preview_path, thumbnail_path = (
                Path(directory) / "preview.mp4",
                Path(directory) / "thumbnail.jpg",
            )
            rendered = await self._renderer.render(command.render_spec, preview_path)
            await self._renderer.thumbnail(rendered.path, thumbnail_path)
            preview = await _put(
                self._store,
                f"projects/{command.project_id}/clips/{command.clip_id}/preview.mp4",
                preview_path,
                "video/mp4",
            )
            thumbnail = await _put(
                self._store,
                f"projects/{command.project_id}/clips/{command.clip_id}/thumbnail.jpg",
                thumbnail_path,
                "image/jpeg",
            )
            return PreviewResult(preview, thumbnail, rendered.probe)


async def _put(store: Any, key: str, path: Path, content_type: str) -> ObjectReference:
    if hasattr(store, "put_file"):
        result = store.put_file(path, key, content_type)
        if hasattr(result, "__await__"):
            result = await result
        return result
    # JSON-only stores are useful in unit tests and still expose deterministic metadata.
    raw = path.read_bytes()
    result = store.put_json(
        key,
        {
            "sha256": hashlib.sha256(raw).hexdigest(),
            "contentType": content_type,
            "sizeBytes": len(raw),
        },
    )
    return await result if hasattr(result, "__await__") else result
