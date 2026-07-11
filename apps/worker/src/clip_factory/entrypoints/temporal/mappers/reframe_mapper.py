from clip_factory.application.build_crop_track import ReframeResult


def reframe_result_to_payload(result: ReframeResult) -> dict[str, object]:
    return {
        "algorithmVersion": result.algorithm_version,
        "probe": result.probe,
        "provenance": {
            "algorithmVersion": result.provenance.algorithm_version,
            "detector": result.provenance.detector,
            "detectorRevision": result.provenance.detector_revision,
            "confidenceFloorMicros": result.provenance.confidence_floor_micros,
            "smoothingAlphaMicros": result.provenance.smoothing_alpha_micros,
            "proxy": {
                "width": result.provenance.proxy_width,
                "sampleRateHz": result.provenance.proxy_sample_rate_hz,
            },
        },
        "points": [point.__dict__ for point in result.points],
    }
