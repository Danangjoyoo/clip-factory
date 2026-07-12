export type PublishingDraftRecordDto = {
  id: string;
  clip_id: string;
};

export interface LeakyPublishingDraftRepositoryPort {
  findById(id: string): Promise<PublishingDraftRecordDto | null>;
  insert(input: PublishingDraftRecordDto): Promise<PublishingDraftRecordDto>;
}
