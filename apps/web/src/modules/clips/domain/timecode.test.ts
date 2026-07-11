import { describe, expect, it } from 'vitest';
import { formatTimecode, parseTimecode } from './timecode';
describe('timecode', () => {
  it('round trips strict millisecond values', () => {
    expect(parseTimecode('01:02:03.456')).toBe(3723456);
    expect(formatTimecode(3723456)).toBe('01:02:03.456');
  });
  it('rejects malformed values', () => {
    expect(() => parseTimecode(' 01:00:00.000')).toThrow('INVALID_TIMECODE');
    expect(() => parseTimecode('00:60:00.000')).toThrow('INVALID_TIMECODE');
    expect(() => formatTimecode(-1)).toThrow('INVALID_TIMECODE');
  });
});
