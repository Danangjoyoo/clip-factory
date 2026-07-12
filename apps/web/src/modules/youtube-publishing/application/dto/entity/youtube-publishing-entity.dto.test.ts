import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { PublicationState as DomainPublicationState } from '../../../domain/publication-state';
import { PublicationVisibility as DomainPublicationVisibility } from '../../../domain/publishing-schedule';
import {
  PublicationState as EntityPublicationState,
  PublicationVisibility as EntityPublicationVisibility,
} from './youtube-publishing-entity.dto';

it('reuses publication state value object from domain policy', () => {
  expect(EntityPublicationState).toBe(DomainPublicationState);
  expect(EntityPublicationVisibility).toBe(DomainPublicationVisibility);
});

it('reexports shared YouTube identifiers without local brands', () => {
  const source = readFileSync(
    'src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto.ts',
    'utf8',
  );
  expect(source).toContain('YouTubeConnectionId');
  expect(source).toContain("from '../../../../../shared/domain'");
  expect(source).not.toMatch(/export type YouTubeConnectionId = string/u);
  expect(source).not.toMatch(/export type PublishingMetadataDraftId = string/u);
  expect(source).not.toMatch(/export type PublicationId = string/u);
  expect(source).not.toMatch(/export type PublicationAttemptId = string/u);
});
