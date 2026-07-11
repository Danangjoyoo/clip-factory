import { expect, it } from 'vitest';
import { createProjectApiToEntity } from './project.converter';
it('maps filepath input into a local-file entity', () => {
  expect(
    createProjectApiToEntity({
      name: 'Interview',
      mode: 'MANUAL',
      language: 'en',
      maxClipSeconds: 60,
      platform: 'YOUTUBE_SHORTS',
      source: { type: 'FILEPATH', path: '/tmp/interview.mov' },
    }),
  ).toEqual({
    name: 'Interview',
    mode: 'MANUAL',
    languageTag: 'en',
    defaultMaxClipSeconds: 60,
    defaultPlatformPreset: 'YOUTUBE_SHORTS',
    source: { kind: 'LOCAL_FILE', displayPath: '/tmp/interview.mov' },
  });
});
