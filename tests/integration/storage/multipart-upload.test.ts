import { expect, it } from 'vitest';
import { sourceObjectKey } from '../../../apps/web/src/modules/storage/application/services/upload-policy';
it('generates project-scoped source keys', () => {
  expect(sourceObjectKey('project', 'session', 'video.mp4')).toBe(
    'projects/project/sources/session.mp4',
  );
});
