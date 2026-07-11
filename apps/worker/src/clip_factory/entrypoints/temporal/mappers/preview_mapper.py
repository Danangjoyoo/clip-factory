from clip_factory.application.generate_preview import PreviewArtifacts
from clip_factory.ports.source_preprocessor import ObjectReference


def preview_result_to_payload(result: PreviewArtifacts) -> dict[str, object]:
    def reference(value: ObjectReference) -> dict[str, object]:
        return {
            "bucket": value.bucket,
            "key": value.key,
            "versionId": value.version_id,
            "sha256": value.sha256,
        }

    return {
        "preview": reference(result.preview),
        "thumbnail": reference(result.thumbnail),
        "probe": result.probe.__dict__ if result.probe else None,
    }
