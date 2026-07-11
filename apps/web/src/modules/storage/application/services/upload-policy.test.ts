import { expect, it } from 'vitest';
import { assertPart, sourceObjectKey, validateUpload } from './upload-policy';

it('rejects unsafe filenames and part counts at the policy boundary', () => {
  expect(() => sourceObjectKey('p', 's', '../../video.mp4')).toThrow(
    'INVALID_FILENAME',
  );
  expect(() => validateUpload(1n, 10001)).toThrow('TOO_MANY_PARTS');
  expect(() => assertPart(0)).toThrow('INVALID_PART');
});
