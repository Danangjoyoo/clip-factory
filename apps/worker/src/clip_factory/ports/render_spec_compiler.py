from dataclasses import dataclass
from enum import Enum
from typing import Protocol

from clip_factory.domain.render_spec import RenderSpec


class RenderProfile(str, Enum):
    PREVIEW = "PREVIEW"
    THUMBNAIL = "THUMBNAIL"
    FINAL = "FINAL"


@dataclass(frozen=True)
class CompiledRenderSpec:
    filters: tuple[str, ...] = ()
    encoders: tuple[str, ...] = ()


class RenderSpecCompiler(Protocol):
    def compile(
        self, spec: RenderSpec, profile: RenderProfile
    ) -> CompiledRenderSpec: ...
