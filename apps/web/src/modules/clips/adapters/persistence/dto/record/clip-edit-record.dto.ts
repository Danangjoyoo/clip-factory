export interface ClipEditRecordDto {
  clipId: string;
  renderId: string;
  sourceJson: unknown;
  rangeJson: unknown;
  captionsJson: unknown;
  styleJson: unknown;
  frameJson: unknown;
  title: string | null;
  platformPreset: string;
  encoderJson: unknown;
}
