from dataclasses import dataclass


@dataclass(frozen=True)
class ModelManifest:
    repo: str = "mlx-community/whisper-large-v3-mlx"
    revision: str = "49e6aa286ad60c14352c404340ded53710378a11"
    weights_sha256: str = "05ff791ce3630fae47e7c51004e9666204d786246ec07cac6110af768099b40d"
    weights_size: int | None = None


MODEL_MANIFEST = ModelManifest()
