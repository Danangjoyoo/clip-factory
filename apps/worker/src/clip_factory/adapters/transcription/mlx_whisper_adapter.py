import asyncio
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from clip_factory.domain.transcript import (
    Transcription,
    TranscriptDocument,
    TranscriptSegment,
    TranscriptWord,
)
from clip_factory.adapters.storage.minio_object_materializer import (
    MinioObjectMaterializer,
)
from .model_cache import ModelCache
from .model_manifest import MODEL_MANIFEST


class MlxWhisperAdapter:
    def __init__(
        self, materializer: MinioObjectMaterializer, cache: ModelCache
    ) -> None:
        self.materializer, self.cache = materializer, cache

    async def transcribe(
        self, audio_object: Any, language_tag: str, progress: Any
    ) -> Transcription:
        model = self.cache.require_verified()
        path, workspace = await asyncio.to_thread(
            self.materializer.materialize, audio_object
        )
        try:
            import mlx_whisper

            result = await asyncio.to_thread(
                mlx_whisper.transcribe,
                str(path),
                path_or_hf_repo=str(model),
                language=language_tag,
                word_timestamps=True,
                task="transcribe",
            )
            words: list[TranscriptWord] = []
            segments = []
            for i, segment in enumerate(result.get("segments", [])):
                start = _ms(segment.get("start", 0))
                end = _ms(segment.get("end", 0))
                start_i = len(words)
                for word in segment.get("words", []):
                    words.append(
                        TranscriptWord(
                            str(word["word"]).strip(),
                            _ms(word["start"]),
                            _ms(word["end"]),
                            _confidence(word.get("probability")),
                        )
                    )
                if words:
                    segments.append(
                        TranscriptSegment(
                            str(segment.get("text", "")).strip(),
                            start,
                            end,
                            start_i,
                            len(words) - 1,
                        )
                    )
                if progress:
                    await progress(i + 1, max(1, len(result.get("segments", []))))
            return Transcription(
                TranscriptDocument(
                    language_tag, str(result.get("text", "")), words, segments
                ),
                "MLX_WHISPER",
                MODEL_MANIFEST.repo,
                MODEL_MANIFEST.revision,
                MODEL_MANIFEST.weights_sha256,
            )
        finally:
            await asyncio.to_thread(_cleanup, workspace)


def _ms(value: float) -> int:
    return int(
        (Decimal(str(value)) * 1000).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )


def _confidence(value: Any) -> int | None:
    return (
        None
        if value is None
        else int(
            (Decimal(str(value)) * 1_000_000).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        )
    )


def _cleanup(workspace: Any) -> None:
    import shutil

    shutil.rmtree(workspace, ignore_errors=True)
