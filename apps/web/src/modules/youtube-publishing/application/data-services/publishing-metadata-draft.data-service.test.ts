import { expect, it, vi } from 'vitest';
import { PublishingMetadataDraftDataService } from './publishing-metadata-draft.data-service';

it('maps stale edit to typed revision conflict', async () => {
  const repository = {
    findById: vi.fn(),
    findLatestForClip: vi.fn(),
    listForClip: vi.fn(),
    insertVersion: vi.fn(),
    updateEditableRevision: vi.fn().mockResolvedValue(null),
    updateStateRevision: vi.fn(),
  };
  const service = new PublishingMetadataDraftDataService(repository);
  await expect(
    service.updateEditableRevision(
      '018f4f2c-93d7-7c75-8f0f-7f5165e8bb52' as never,
      1,
      {
        title: 'Title',
        description: '',
        hashtags: [],
        keywordTags: [],
        categoryId: '22',
        defaultLanguage: 'en',
        madeForKids: false,
        containsSyntheticMedia: false,
      },
    ),
  ).rejects.toMatchObject({ code: 'METADATA_DRAFT_REVISION_CONFLICT' });
});
