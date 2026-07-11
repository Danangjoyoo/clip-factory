import hashlib
import pytest
from clip_factory.adapters.transcription.model_cache import ModelCache, ModelHashMismatch
from clip_factory.adapters.transcription.model_manifest import ModelManifest

def test_cache_verifies_hash_and_deletes_mismatch(tmp_path):
    manifest = ModelManifest(weights_sha256=hashlib.sha256(b'ok').hexdigest())
    path = tmp_path / manifest.revision
    path.mkdir()
    (path / 'weights.npz').write_bytes(b'bad')
    with pytest.raises(ModelHashMismatch):
        ModelCache(tmp_path, manifest).require_verified()
    assert not path.exists()
