import pytest
from clip_factory.entrypoints.contracts.render_spec_mapper import map_render_spec


def payload():
    return {
        "schemaVersion": "1.0.0",
        "renderId": "00000000-0000-4000-8000-000000000001",
        "clipId": "00000000-0000-4000-8000-000000000002",
        "source": {
            "kind": "LOCAL_FILE",
            "sourceAssetId": "00000000-0000-4000-8000-000000000003",
            "fingerprint": "a" * 64,
            "sizeBytes": 1,
            "modifiedAt": "2026-07-11T00:00:00Z",
        },
        "canvas": {"width": 1080, "height": 1920},
        "range": {"startMs": 0, "endMs": 1},
        "cropTrack": [],
        "captions": [],
        "style": {
            "fontFamily": "Inter",
            "fontSizePx": 24,
            "textColor": "#ffffffff",
            "outlineColor": "#000000ff",
            "backgroundColor": "#00000000",
            "activeWordColor": "#ffffffff",
            "verticalPositionMicros": 500000,
            "maxWordsPerLine": 1,
            "activeWordEmphasis": True,
        },
        "title": None,
        "encoder": {
            "strategy": "SOFTWARE",
            "videoCodec": "h264",
            "audioCodec": "aac",
            "pixelFormat": "yuv420p",
        },
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
    with pytest.raises(TypeError):
        spec.source["kind"] = "BROWSER_UPLOAD"  # type: ignore[index]
    value = payload()
    value["source"] = {
        "kind": "BROWSER_UPLOAD",
        "sourceAssetId": value["source"]["sourceAssetId"],
        "object": {
            "bucket": "clip-factory",
            "key": "clips/out.mp4",
            "versionId": None,
            "sha256": "a" * 64,
        },
    }
    value["cropTrack"] = [
        {
            "timeMs": 0,
            "centerXMicros": 500000,
            "centerYMicros": 500000,
            "confidenceMicros": 500000,
            "source": "CENTER_FALLBACK",
        }
    ]
    value["captions"] = [
        {
            "id": "00000000-0000-4000-8000-000000000004",
            "startMs": 0,
            "endMs": 1000,
            "words": [{"text": "hello", "startMs": 0, "endMs": 1000}],
        }
    ]
    spec = map_render_spec(value)
    with pytest.raises(TypeError):
        spec.source["object"]["key"] = "changed"  # type: ignore[index]
    with pytest.raises(TypeError):
        spec.crop_track[0]["timeMs"] = 1  # type: ignore[index]
    with pytest.raises(TypeError):
        spec.captions[0]["words"][0]["text"] = "changed"  # type: ignore[index]
    with pytest.raises(TypeError):
        spec.style["fontFamily"] = "Arial"  # type: ignore[index]
    with pytest.raises(TypeError):
        spec.encoder["strategy"] = "SOFTWARE"  # type: ignore[index]


@pytest.mark.parametrize(
    "object_key",
    ["/Users/me/video.mp4", "C:\\Users\\me\\video.mp4", "\\\\server\\share\\video.mp4"],
)
def test_rejects_absolute_browser_upload_object_path(object_key):
    value = payload()
    value["source"] = {
        "kind": "BROWSER_UPLOAD",
        "sourceAssetId": value["source"]["sourceAssetId"],
        "object": {
            "bucket": "clip-factory",
            "key": object_key,
            "versionId": None,
            "sha256": "a" * 64,
        },
    }
    with pytest.raises(ValueError, match="PRIVATE_SOURCE_VALUE"):
        map_render_spec(value)
