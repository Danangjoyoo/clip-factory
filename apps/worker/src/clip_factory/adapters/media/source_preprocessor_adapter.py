import hashlib
import inspect
from pathlib import Path
from typing import Any
from uuid import UUID

from clip_factory.adapters.media.ffmpeg_adapter import FfmpegAdapter
from clip_factory.adapters.media.ffprobe_adapter import FfprobeAdapter
from clip_factory.adapters.media.source_media_lease import SourceMediaLease
from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client_models import (
    LocalFileLocator,
    SourceValidationUpdate,
)
from clip_factory.adapters.http.source_locator_client import modified_at
from clip_factory.domain.media import MediaProbe, validate_probe
from clip_factory.ports.source_preprocessor import (
    AudioValidationReceipt,
    AudioValidationReceiptPort,
    ObjectReference,
    PreparedSource,
    ProgressCallback,
)


AUDIO_NORMALIZATION_VERSION = "speech-pcm-s16le-mono-16khz-v1"


class SourcePreprocessorAdapter:
    def __init__(
        self,
        locator_client: Any,
        ffprobe: FfprobeAdapter,
        ffmpeg: FfmpegAdapter,
        artifact_store: Any,
        local_filesystem: LocalSourceFilesystem,
        materializer: Any,
        validation_receipts: AudioValidationReceiptPort,
    ) -> None:
        self._locator_client = locator_client
        self._ffprobe = ffprobe
        self._ffmpeg = ffmpeg
        self._artifact_store = artifact_store
        self._local_filesystem = local_filesystem
        self._materializer = materializer
        self._validation_receipts = validation_receipts

    async def prepare(
        self, source_asset_id: UUID, project_id: UUID, heartbeat: ProgressCallback
    ) -> PreparedSource:
        locator = self._locator_client.get(str(source_asset_id))
        lease = SourceMediaLease(locator, self._local_filesystem, self._materializer)
        async with lease as source:
            probe = await self._ffprobe.probe(source)
            validate_probe(probe)
            await _heartbeat(heartbeat, 1, 3)
            fingerprint = _source_fingerprint(locator, self._local_filesystem, source)
            key = f"projects/{project_id}/audio/{source_asset_id}.wav"
            existing = self._reuse_if_valid(key, str(source_asset_id), fingerprint)
            if existing is not None:
                reference = existing
                await _heartbeat(heartbeat, 3, 3)
            else:
                audio = lease.workspace / "speech.wav"
                await self._ffmpeg.extract_speech(
                    source,
                    audio,
                    lambda value: _heartbeat(
                        heartbeat, min(value, 2_000_000), 3_000_000
                    ),
                )
                reference = self._put_audio(audio, key)
                self._record_receipt(
                    AudioValidationReceipt(
                        str(source_asset_id),
                        fingerprint,
                        AUDIO_NORMALIZATION_VERSION,
                        reference,
                    )
                )
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

    def _reuse_if_valid(
        self, key: str, source_asset_id: str, fingerprint: str
    ) -> ObjectReference | None:
        head = getattr(self._artifact_store, "head", None)
        if not fingerprint or not callable(head):
            return None
        receipt = self._validation_receipts.get(key)
        if not isinstance(receipt, AudioValidationReceipt):
            return None
        reference = receipt.audio_object
        if (
            receipt.source_asset_id != source_asset_id
            or receipt.fingerprint != fingerprint
            or receipt.normalization_version != AUDIO_NORMALIZATION_VERSION
            or reference.key != key
            or not reference.version_id
            or not reference.sha256
        ):
            return None
        metadata = head(key)
        version_id = _metadata_value(metadata, "version_id", "versionId")
        digest = _metadata_value(metadata, "sha256", "etag")
        if version_id != reference.version_id or digest != reference.sha256:
            return None
        return reference

    def _record_receipt(self, receipt: AudioValidationReceipt) -> None:
        self._validation_receipts.put(receipt)

    def _put_audio(self, audio: Path, key: str) -> ObjectReference:
        result = self._artifact_store.put(audio, key)
        if isinstance(result, ObjectReference):
            return result
        digest = hashlib.sha256(audio.read_bytes()).hexdigest()
        return ObjectReference(
            bucket=str(getattr(result, "bucket", "clip-factory")),
            key=str(getattr(result, "key", key)),
            version_id=str(
                getattr(result, "version_id", getattr(result, "versionId", ""))
            ),
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


def _source_fingerprint(
    locator: object, filesystem: LocalSourceFilesystem, source: Path
) -> str:
    fingerprint = getattr(locator, "fingerprint", None)
    if isinstance(fingerprint, str) and fingerprint:
        return fingerprint
    if isinstance(locator, LocalFileLocator):
        return filesystem.validate(source).fingerprint
    return ""


def _metadata_value(value: object, *names: str) -> str | None:
    if isinstance(value, dict):
        for name in names:
            candidate = value.get(name)
            if candidate:
                return str(candidate)
    for name in names:
        candidate = getattr(value, name, None)
        if candidate:
            return str(candidate)
    return None
