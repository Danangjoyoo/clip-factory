import { expect, it } from 'vitest';
import {
  InMemoryProjectRepository,
  InMemorySourceAssetRepository,
  InMemoryUnitOfWork,
} from '../../testing/repositories';
import { ProjectDataService } from '../data-services/project.data-service';
import { SourceAssetDataService } from '../data-services/source-asset.data-service';
import { CreateProjectService } from './create-project.service';
it('creates a draft project and source in one unit of work', async () => {
  const result = await new CreateProjectService(
    new InMemoryUnitOfWork(),
    new ProjectDataService(new InMemoryProjectRepository()),
    new SourceAssetDataService(new InMemorySourceAssetRepository()),
  ).execute({
    name: 'Interview',
    mode: 'MANUAL',
    languageTag: 'en',
    defaultMaxClipSeconds: 60,
    defaultPlatformPreset: 'YOUTUBE_SHORTS',
    source: { kind: 'LOCAL_FILE', displayPath: '/tmp/interview.mov' },
  });
  expect(result.project.status).toBe('DRAFT');
  expect(result.source.projectId).toBe(result.project.id);
  expect(result.source.health).toBe('UNKNOWN');
});
