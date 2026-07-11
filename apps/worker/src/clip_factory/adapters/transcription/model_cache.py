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
        if (
            self.manifest.weights_sha256
            and hashlib.sha256(weights.read_bytes()).hexdigest()
            != self.manifest.weights_sha256
        ):
            shutil.rmtree(path, ignore_errors=True)
            raise ModelHashMismatch("TRANSCRIPTION_MODEL_HASH_MISMATCH")
        return path

    def download(self) -> Path:
        from huggingface_hub import snapshot_download

        path = Path(
            snapshot_download(
                repo_id=self.manifest.repo,
                revision=self.manifest.revision,
                local_dir=str(self.root / self.manifest.revision),
            )
        )
        return self.require_verified() if self.manifest.weights_sha256 else path
