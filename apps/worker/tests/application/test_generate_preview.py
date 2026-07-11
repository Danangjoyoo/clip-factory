import asyncio
from pathlib import Path

from clip_factory.application.generate_preview import GeneratePreview, PreviewCommand
from clip_factory.domain.media import MediaProbe
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.source_preprocessor import ObjectReference


class Renderer:
    async def render(self, spec, destination, width=360, height=640, progress=None):
        assert spec.render_id == "render"
        destination.write_bytes(b"video")
        return MediaProbe(1000, 5, "mp4", "h264", width, height, 30, 1, "aac", 48000)

    async def thumbnail(self, preview, destination, time_ms=0):
        assert preview.exists() and time_ms == 0
        destination.write_bytes(b"image")


class Store:
    async def put_file(self, key: str, path: Path) -> ObjectReference:
        return ObjectReference("bucket", key, "v1", path.read_bytes().hex())


def test_preview_artifacts_are_project_scoped() -> None:
    spec = RenderSpec(
        "1.0.0",
        "render",
        "clip",
        {"path": "/tmp/source.mp4"},
        (360, 640),
        (0, 1000),
        (),
        (),
        {},
        None,
        {},
        "shorts",
    )
    result = asyncio.run(
        GeneratePreview(Renderer(), Store()).execute(
            PreviewCommand("project", "clip", spec)
        )
    )
    assert result.preview.key == "projects/project/clips/clip/preview.mp4"
    assert result.thumbnail.key == "projects/project/clips/clip/thumbnail.jpg"
    assert (result.probe.width, result.probe.height) == (360, 640)
