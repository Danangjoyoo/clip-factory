from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import shutil
import tempfile
import time
from pathlib import Path
from uuid import UUID, uuid4

from clip_factory.adapters.media.ffmpeg_adapter import FfmpegAdapter
from clip_factory.adapters.process.asyncio_process_runner import AsyncioProcessRunner
from clip_factory.adapters.storage.minio_artifact_store import MinioArtifactStore
from clip_factory.adapters.storage.minio_object_materializer import (
    MinioObjectMaterializer,
)
from clip_factory.adapters.transcription.mlx_whisper_adapter import MlxWhisperAdapter
from clip_factory.adapters.transcription.model_cache import ModelCache
from clip_factory.application.transcribe_source import TranscribeCommand, TranscribeSource
from clip_factory.ports.source_preprocessor import ObjectReference


class Clock:
    def monotonic_ms(self) -> int:
        return int(time.monotonic() * 1000)


class LocalAudioStore:
    def __init__(self, source: Path, version_id: str, sha256: str) -> None:
        self.source = source
        self.version_id = version_id
        self.sha256 = sha256

    def download(self, _reference: ObjectReference, destination: Path) -> str:
        shutil.copyfile(self.source, destination)
        return self.version_id

    def head(self, _reference: ObjectReference) -> object:
        return {"version_id": self.version_id, "sha256": self.sha256}


async def transcribe(args: argparse.Namespace) -> dict[str, object]:
    source = Path(args.source)
    if not source.is_file():
        raise FileNotFoundError("SOURCE_NOT_FOUND")
    workspace = Path(tempfile.mkdtemp(prefix="clip-factory-transcribe-"))
    workspace.chmod(0o700)
    try:
        audio = workspace / "speech.wav"
        runner = AsyncioProcessRunner()
        await FfmpegAdapter(runner, args.ffmpeg).extract_speech(source, audio)
        raw = audio.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        reference = ObjectReference("local", "speech.wav", "v1", digest)
        result = await TranscribeSource(
            MlxWhisperAdapter(
                MinioObjectMaterializer(LocalAudioStore(audio, "v1", digest)),
                ModelCache(Path(args.model_cache)),
            ),
            MinioArtifactStore(Path(args.artifact_root)),
            Clock(),
        ).execute(
            TranscribeCommand(
                UUID(args.project_id),
                reference,
                args.language,
                transcript_id=UUID(args.transcript_id),
            )
        )
        path = Path(args.artifact_root) / result.object_reference.bucket / result.object_reference.key
        document = json.loads(path.read_text())
        return {
            "text": document["text"],
            "words": document["words"],
            "durationMs": result.duration_ms,
            "runtimeMs": result.runtime_ms,
            "backend": result.backend,
            "model": result.model,
            "modelRevision": result.model_revision,
            "weightsSha256": result.weights_sha256,
            "objectBucket": result.object_reference.bucket,
            "objectKey": result.object_reference.key,
            "objectVersionId": result.object_reference.version_id,
            "objectSha256": result.object_reference.sha256,
        }
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser()
    value.add_argument("--source", required=True)
    value.add_argument("--project-id", required=True)
    value.add_argument("--language", default="en")
    value.add_argument("--artifact-root", default=".clip-factory-artifacts")
    value.add_argument("--model-cache", default=".clip-factory-models")
    value.add_argument("--transcript-id", default=str(uuid4()))
    value.add_argument("--ffmpeg", default="ffmpeg")
    return value


def main() -> None:
    args = parser().parse_args()
    print(json.dumps(asyncio.run(transcribe(args)), sort_keys=True))


if __name__ == "__main__":
    main()
