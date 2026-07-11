import asyncio
from clip_factory.adapters.storage.minio_artifact_store import MinioArtifactStore


def test_artifact_store_returns_versioned_hash(tmp_path):
    ref = asyncio.run(MinioArtifactStore(tmp_path).put_json("x.v1.json", {"ok": True}))
    assert ref.version_id == "v1" and len(ref.sha256) == 64
