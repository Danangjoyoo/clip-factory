import { expect, it } from 'vitest';
import {
  uploadSessionEntityToRecord,
  uploadSessionRecordToEntity,
} from './upload-session.converter';
import { uploadHarness } from '../../../testing/upload-harness';
it('keeps immutable object references through record conversion', async () => {
  const h = uploadHarness();
  const entity = await h.sessions.requireOwned(h.sessionId, h.projectId);
  const roundTrip = uploadSessionRecordToEntity(
    uploadSessionEntityToRecord(entity),
  );
  expect(roundTrip.objectReference).toEqual(entity.objectReference);
});
