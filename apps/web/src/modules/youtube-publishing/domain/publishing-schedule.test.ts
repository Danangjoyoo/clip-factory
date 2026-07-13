import { describe, expect, it } from 'vitest';

import {
  decidePublicationVisibility,
  detectScheduleCollision,
  normalizePublishingSchedule,
  visibilityRequiresSchedule,
} from './publishing-schedule';

describe('publishing schedule', () => {
  const now = new Date('2026-07-11T00:00:00.000Z');

  it('stores source timezone and normalized UTC instant', () => {
    expect(
      normalizePublishingSchedule('2026-07-12T09:30:00', 'Asia/Tokyo', now),
    ).toEqual({
      sourceLocalDateTime: '2026-07-12T09:30:00',
      sourceTimezone: 'Asia/Tokyo',
      publishAtUtc: '2026-07-12T00:30:00Z',
    });
  });

  it.each([
    [
      '2026-03-08T02:30:00',
      'America/New_York',
      'nonexistent or ambiguous local time',
    ],
    [
      '2026-11-01T01:30:00',
      'America/New_York',
      'nonexistent or ambiguous local time',
    ],
    ['2026-07-10T09:30:00', 'Asia/Tokyo', 'schedule must be in the future'],
  ])('rejects invalid wall time %s in %s', (local, zone, message) => {
    expect(() => normalizePublishingSchedule(local, zone, now)).toThrow(
      message,
    );
  });

  it('requires confirmation for an existing instant within five minutes', () => {
    expect(
      detectScheduleCollision(
        '2026-07-12T00:33:00Z',
        ['2026-07-12T00:30:00Z'],
        false,
      ),
    ).toEqual({ requiresConfirmation: true });
    expect(
      detectScheduleCollision(
        '2026-07-12T00:33:00Z',
        ['2026-07-12T00:30:00Z'],
        true,
      ),
    ).toEqual({ requiresConfirmation: false });
    expect(
      detectScheduleCollision(
        '2026-07-12T00:36:00Z',
        ['2026-07-12T00:30:00Z'],
        false,
      ),
    ).toEqual({ requiresConfirmation: false });
  });

  it('locks scheduling for unverified API project', () => {
    expect(() =>
      decidePublicationVisibility({
        requested: 'SCHEDULED',
        apiProjectVerified: false,
        schedule: {
          sourceLocalDateTime: '2026-07-12T09:30:00',
          sourceTimezone: 'Asia/Tokyo',
          publishAtUtc: '2026-07-12T00:30:00Z',
        },
      }),
    ).toThrow('unverified API projects support private review only');
    expect(() =>
      decidePublicationVisibility({
        requested: 'PRIVATE_REVIEW',
        apiProjectVerified: true,
        schedule: {
          sourceLocalDateTime: 'x',
          sourceTimezone: 'x',
          publishAtUtc: 'x',
        },
      }),
    ).toThrow('private review cannot include publishAt');
    expect(
      visibilityRequiresSchedule(
        decidePublicationVisibility({
          requested: 'PRIVATE_REVIEW',
          apiProjectVerified: true,
          schedule: null,
        }),
      ),
    ).toBe(false);
    expect(
      decidePublicationVisibility({
        requested: 'SCHEDULED',
        apiProjectVerified: true,
        schedule: {
          sourceLocalDateTime: 'x',
          sourceTimezone: 'x',
          publishAtUtc: 'x',
        },
      }),
    ).toBe('SCHEDULED');
    expect(visibilityRequiresSchedule('SCHEDULED')).toBe(true);
    expect(() =>
      decidePublicationVisibility({
        requested: 'SCHEDULED',
        apiProjectVerified: true,
        schedule: null,
      }),
    ).toThrow('scheduled publication requires a schedule');
  });
});
