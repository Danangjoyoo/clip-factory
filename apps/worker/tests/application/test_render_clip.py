import asyncio
from clip_factory.application.render_clip import RenderClip


def test_render_clip_rejects_invalid_output_before_completion():
    class Engine:
        async def render(self, *args):
            return None

    async def run():
        try:
            await RenderClip(Engine(), None).execute({"output": {"width": 1}})
        except ValueError as error:
            assert str(error) == "RENDER_OUTPUT_INVALID"
        else:
            raise AssertionError("invalid output accepted")

    asyncio.run(run())
