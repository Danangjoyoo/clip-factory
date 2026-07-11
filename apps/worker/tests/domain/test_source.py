from pathlib import Path

from clip_factory.adapters.filesystem.local_source import SAMPLE_BYTES, fingerprint


def test_fingerprint_samples_first_middle_last(tmp_path: Path) -> None:
    path = tmp_path / "source.mov"
    path.write_bytes(b"a" * 100_000 + b"b" * 100_000 + b"c" * 100_000)
    stat = path.stat()
    first = fingerprint(path, stat)
    path.write_bytes(b"a" * 100_000 + b"x" + b"b" * 99_999 + b"c" * 100_000)
    assert fingerprint(path, path.stat()) != first
    assert SAMPLE_BYTES == 65_536
