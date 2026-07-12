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
