import pytest
from clip_factory.entrypoints.contracts.render_spec_mapper import map_render_spec


def payload():
    return {
        "schemaVersion": "1.0.0",
        "renderId": "00000000-0000-4000-8000-000000000001",
        "clipId": "00000000-0000-4000-8000-000000000002",
        "source": {"kind": "LOCAL_FILE", "sourceAssetId": "00000000-0000-4000-8000-000000000003", "fingerprint": "a" * 64, "sizeBytes": 1, "modifiedAt": "2026-07-11T00:00:00Z"},
        "canvas": {"width": 1080, "height": 1920},
        "range": {"startMs": 0, "endMs": 1},
        "cropTrack": [],
        "captions": [],
        "style": {"fontFamily": "Inter", "fontSizePx": 24, "textColor": "#ffffffff", "outlineColor": "#000000ff", "backgroundColor": "#00000000", "activeWordColor": "#ffffffff", "verticalPositionMicros": 500000, "maxWordsPerLine": 1, "activeWordEmphasis": True},
        "title": None,
        "encoder": {"strategy": "SOFTWARE", "videoCodec": "h264", "audioCodec": "aac", "pixelFormat": "yuv420p"},
        "platformPreset": "TIKTOK",
    }


def test_rejects_unknown_version():
    value = payload()
    value["schemaVersion"] = "2.0.0"
    with pytest.raises(ValueError, match="UNKNOWN_RENDER_SPEC_VERSION"):
        map_render_spec(value)


def test_maps_valid_payload():
    spec = map_render_spec(payload())
    assert spec.canvas == (1080, 1920)
    try:
        spec.source["kind"] = "BROWSER_UPLOAD"  # type: ignore[index]
    except TypeError:
        pass
    else:
        raise AssertionError("nested RenderSpec values must be immutable")


def test_rejects_private_source_path():
    value = payload()
    value["source"]["resolvedPath"] = "/Users/me/video.mp4"
    with pytest.raises(ValueError, match="PRIVATE_SOURCE_VALUE"):
        map_render_spec(value)
