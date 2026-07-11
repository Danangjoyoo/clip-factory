import type { SourceAssetEntityDto } from '../../../application/dto/entity';
import type { SourceAssetRecordDto } from '../dto/record/source-asset-record.dto';
export const sourceAssetRecordToEntity = (
  r: SourceAssetRecordDto,
): SourceAssetEntityDto => ({ ...r, probe: r.probeJson });
export const sourceAssetEntityToRecord = (
  e: SourceAssetEntityDto,
): SourceAssetRecordDto => ({ ...e, probeJson: e.probe });
