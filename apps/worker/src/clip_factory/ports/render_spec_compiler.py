from dataclasses import dataclass
from typing import Literal, Protocol

from clip_factory.domain.render_spec import RenderSpec


RenderProfile = Literal["preview", "thumbnail"]


@dataclass(frozen=True)
class CompiledRenderSpec:
    filter_args: tuple[str, ...]
    encoder_args: tuple[str, ...]


class RenderSpecCompiler(Protocol):
    def compile(
        self, spec: RenderSpec, profile: RenderProfile
    ) -> CompiledRenderSpec: ...
