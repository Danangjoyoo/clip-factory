from typing import Any
from clip_factory.domain.render import RenderOutput, validate_render_output


class RenderClip:
    def __init__(self, engine: Any, result_probe: Any) -> None:
        self._engine, self._result_probe = engine, result_probe

    async def execute(self, payload: dict[str, Any]) -> Any:
        output = payload.get("output", {})
        try:
            validate_render_output(RenderOutput(**output))
        except (TypeError, ValueError) as error:
            raise ValueError("RENDER_OUTPUT_INVALID") from error
        return output
