import asyncio
from pathlib import Path

from clip_factory.application.generate_preview import GeneratePreview, PreviewCommand
from clip_factory.domain.render_spec import RenderSpec
from clip_factory.ports.preview_renderer import PreviewMedia
from clip_factory.ports.source_preprocessor import ObjectReference


class Renderer:
    def __init__(self):
        self.specs = []

    async def render(self, spec, destination, width=360, height=640):
        self.specs.append(spec)
        destination.write_bytes(b"preview")
        return PreviewMedia(destination)

    async def thumbnail(self, preview, destination, time_ms=0):
        destination.write_bytes(b"thumb")
        return destination


class Store:
    def put_file(self, path: Path, key: str, content_type: str = ""):
        return ObjectReference("bucket", key, "v1", "hash")


def test_preview_is_scoped_and_uses_the_shared_spec():
    renderer, spec = (
        Renderer(),
        RenderSpec(
            "1.0.0",
            "r",
            "c",
            {"kind": "LOCAL_FILE"},
            (1080, 1920),
            (0, 1000),
            (),
            (),
            {},
            None,
            {},
            "TIKTOK",
        ),
    )
    result = asyncio.run(
        GeneratePreview(renderer, Store()).execute(PreviewCommand("p", "c", spec))
    )
    assert renderer.specs == [spec]
    assert result.preview.key == "projects/p/clips/c/preview.mp4"
    assert result.thumbnail.key == "projects/p/clips/c/thumbnail.jpg"
