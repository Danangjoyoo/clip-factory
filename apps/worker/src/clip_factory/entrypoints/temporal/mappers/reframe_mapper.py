from clip_factory.application.build_crop_track import ReframeResult


def reframe_result_to_payload(result: ReframeResult) -> dict[str, object]:
    return {
        "algorithmVersion": result.algorithm_version,
        "probe": result.probe,
        "points": [point.__dict__ for point in result.points],
    }
