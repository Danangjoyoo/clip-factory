import pytest
from clip_factory.entrypoints.contracts.render_spec_mapper import map_render_spec


def payload():
    return {
        "schemaVersion": "1.0.0",
        "renderId": "r",
        "clipId": "c",
        "source": {"kind": "LOCAL_FILE"},
        "canvas": {"width": 1080, "height": 1920},
        "range": {"startMs": 0, "endMs": 1},
        "cropTrack": [],
        "captions": [],
        "style": {},
        "title": None,
        "encoder": {"strategy": "SOFTWARE"},
        "platformPreset": "TIKTOK",
    }


def test_rejects_unknown_version():
    value = payload()
    value["schemaVersion"] = "2.0.0"
    with pytest.raises(ValueError, match="UNKNOWN_RENDER_SPEC_VERSION"):
        map_render_spec(value)


def test_maps_valid_payload():
    assert map_render_spec(payload()).canvas == (1080, 1920)
