import type { FrameConfigurationEntityDto } from '../../../application/dto/entity/frame-configuration-entity.dto';
import type { FrameConfigurationRecordDto } from '../dto/record/frame-configuration-record.dto';
export const frameConfigurationRecordToEntity = (
  record: FrameConfigurationRecordDto,
): FrameConfigurationEntityDto => ({
  clipId: record.clipId,
  automaticTrack: record.automaticTrackJson as readonly Record<
    string,
    unknown
  >[],
  manualFocalPoint:
    record.manualFocalPointJson as FrameConfigurationEntityDto['manualFocalPoint'],
  provenance:
    record.provenanceJson as FrameConfigurationEntityDto['provenance'],
});
export const frameConfigurationEntityToRecord = (
  entity: FrameConfigurationEntityDto,
): FrameConfigurationRecordDto => ({
  clipId: entity.clipId,
  automaticTrackJson: entity.automaticTrack,
  manualFocalPointJson: entity.manualFocalPoint,
  provenanceJson: entity.provenance,
});
