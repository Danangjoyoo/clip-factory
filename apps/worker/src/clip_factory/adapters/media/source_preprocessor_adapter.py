import hashlib
import inspect
from pathlib import Path
from typing import Any
from uuid import UUID

from clip_factory.adapters.media.ffmpeg_adapter import FfmpegAdapter
from clip_factory.adapters.media.ffprobe_adapter import FfprobeAdapter
from clip_factory.adapters.media.source_media_lease import SourceMediaLease
from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client_models import LocalFileLocator, SourceValidationUpdate
from clip_factory.adapters.http.source_locator_client import modified_at
from clip_factory.domain.media import MediaProbe, validate_probe
from clip_factory.ports.source_preprocessor import ObjectReference, PreparedSource, ProgressCallback


class SourcePreprocessorAdapter:
    def __init__(
        self,
        locator_client: Any,
        ffprobe: FfprobeAdapter,
        ffmpeg: FfmpegAdapter,
        artifact_store: Any,
        local_filesystem: LocalSourceFilesystem,
        materializer: Any,
    ) -> None:
        self._locator_client = locator_client
        self._ffprobe = ffprobe
        self._ffmpeg = ffmpeg
        self._artifact_store = artifact_store
        self._local_filesystem = local_filesystem
        self._materializer = materializer

    async def prepare(
        self, source_asset_id: UUID, project_id: UUID, heartbeat: ProgressCallback
    ) -> PreparedSource:
        locator = self._locator_client.get(str(source_asset_id))
        lease = SourceMediaLease(locator, self._local_filesystem, self._materializer)
        async with lease as source:
            probe = await self._ffprobe.probe(source)
            validate_probe(probe)
            await _heartbeat(heartbeat, 1, 3)
            audio = lease.workspace / "speech.wav"
            await self._ffmpeg.extract_speech(source, audio, lambda value: _heartbeat(heartbeat, min(value, 2_000_000), 3_000_000))
            key = f"projects/{project_id}/audio/{source_asset_id}.wav"
            reference = self._put_audio(audio, key)
            await _heartbeat(heartbeat, 3, 3)
        if isinstance(locator, LocalFileLocator):
            validated = self._local_filesystem.validate(Path(locator.candidate_path))
            self._locator_client.apply_locator_validation(
                SourceValidationUpdate(
                    str(source_asset_id),
                    str(validated.resolved_path),
                    validated.size_bytes,
                    modified_at(validated.modified_ns),
                    validated.fingerprint,
                    _probe_dict(probe),
                )
            )
        return PreparedSource(source_asset_id, probe, reference)

    def _put_audio(self, audio: Path, key: str) -> ObjectReference:
        result = self._artifact_store.put(audio, key)
        if isinstance(result, ObjectReference):
            return result
        digest = hashlib.sha256(audio.read_bytes()).hexdigest()
        return ObjectReference(
            bucket=str(getattr(result, "bucket", "clip-factory")),
            key=str(getattr(result, "key", key)),
            version_id=str(getattr(result, "version_id", getattr(result, "versionId", ""))),
            sha256=str(getattr(result, "sha256", digest)),
        )


async def _heartbeat(callback: ProgressCallback, completed: int, total: int) -> None:
    result = callback(completed, total)
    if inspect.isawaitable(result):
        await result


def _probe_dict(probe: MediaProbe) -> dict[str, object]:
    return {
        "durationMs": probe.duration_ms,
        "sizeBytes": probe.size_bytes,
        "container": probe.container,
        "videoCodec": probe.video_codec,
        "width": probe.width,
        "height": probe.height,
        "frameRateNumerator": probe.frame_rate_numerator,
        "frameRateDenominator": probe.frame_rate_denominator,
        "audioCodec": probe.audio_codec,
        "sampleRateHz": probe.sample_rate_hz,
    }
