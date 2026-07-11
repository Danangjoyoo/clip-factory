from clip_factory.application.validate_local_source import ValidateLocalSource
from clip_factory.domain.source import SourceValidationReceipt


def validate_local_source(
    activity: ValidateLocalSource, source_asset_id: str
) -> SourceValidationReceipt:
    return activity.execute(source_asset_id)
