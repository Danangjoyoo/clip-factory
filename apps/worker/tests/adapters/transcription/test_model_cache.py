import hashlib
import sys
import types
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


def test_download_uses_manifest_and_verifies_snapshot(monkeypatch, tmp_path):
    manifest = ModelManifest(weights_sha256=hashlib.sha256(b'ok').hexdigest())
    calls = []

    def snapshot_download(**kwargs):
        calls.append(kwargs)
        path = tmp_path / manifest.revision
        path.mkdir()
        (path / 'weights.npz').write_bytes(b'ok')
        return str(path)

    monkeypatch.setitem(sys.modules, 'huggingface_hub', types.SimpleNamespace(snapshot_download=snapshot_download))
    assert ModelCache(tmp_path, manifest).download() == tmp_path / manifest.revision
    assert calls == [{
        'repo_id': manifest.repo,
        'revision': manifest.revision,
        'local_dir': str(tmp_path / manifest.revision),
    }]
