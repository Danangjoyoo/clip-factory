from clip_factory import __version__


def test_worker_package_version_is_pinned() -> None:
    assert __version__ == "0.1.0"
