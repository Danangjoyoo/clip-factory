import type { SourceAssetEntityDto } from '../dto/entity/source-asset-entity.dto';

export type ValidatedRelink = Pick<
  SourceAssetEntityDto,
  | 'displayPath'
  | 'resolvedPath'
  | 'sizeBytes'
  | 'modifiedAt'
  | 'fingerprint'
  | 'probe'
>;

/** Worker-owned validation; callers must never persist client supplied metadata. */
export interface SourceValidationPort {
  validateCandidate(input: {
    sourceAssetId: string;
    candidatePath: string;
  }): Promise<ValidatedRelink>;
}
