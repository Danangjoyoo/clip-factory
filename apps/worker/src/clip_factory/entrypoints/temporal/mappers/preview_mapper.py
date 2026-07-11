from clip_factory.application.generate_preview import PreviewResult


def preview_result_to_payload(result: PreviewResult) -> dict[str, object]:
    def reference(value: object) -> dict[str, object]:
        return {
            "bucket": value.bucket,
            "key": value.key,
            "versionId": value.version_id,
            "sha256": value.sha256,
        }  # type: ignore[attr-defined]

    return {
        "preview": reference(result.preview),
        "thumbnail": reference(result.thumbnail),
        "probe": result.probe.__dict__ if result.probe else None,
    }
