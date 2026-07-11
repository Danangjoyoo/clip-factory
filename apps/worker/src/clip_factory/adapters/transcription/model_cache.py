import hashlib
import shutil
from pathlib import Path
from .model_manifest import MODEL_MANIFEST, ModelManifest


class ModelCacheError(RuntimeError):
    pass


class ModelHashMismatch(ModelCacheError):
    pass


class ModelCache:
    def __init__(self, root: Path, manifest: ModelManifest = MODEL_MANIFEST) -> None:
        self.root, self.manifest = root, manifest

    def require_verified(self) -> Path:
        path = self.root / self.manifest.revision
        weights = path / "weights.npz"
        if not weights.exists():
            raise ModelCacheError("TRANSCRIPTION_MODEL_NOT_CACHED")
        digest = hashlib.sha256(weights.read_bytes()).hexdigest()
        if digest != self.manifest.weights_sha256 or (
            self.manifest.weights_size is not None
            and weights.stat().st_size != self.manifest.weights_size
        ):
            shutil.rmtree(path, ignore_errors=True)
            raise ModelHashMismatch("TRANSCRIPTION_MODEL_HASH_MISMATCH")
        return path

    def download(self) -> Path:
        from huggingface_hub import snapshot_download

        snapshot_download(
            repo_id=self.manifest.repo,
            revision=self.manifest.revision,
            local_dir=str(self.root / self.manifest.revision),
        )
        return self.require_verified()
