import { Temporal } from '@js-temporal/polyfill';

export type PublishingSchedule = {
  sourceLocalDateTime: string;
  sourceTimezone: string;
  publishAtUtc: string;
};

export const PublicationVisibility = {
  PrivateReview: 'PRIVATE_REVIEW',
  Scheduled: 'SCHEDULED',
} as const;

export type PublicationVisibility =
  (typeof PublicationVisibility)[keyof typeof PublicationVisibility];

export function normalizePublishingSchedule(
  sourceLocalDateTime: string,
  sourceTimezone: string,
  now: Date,
): PublishingSchedule {
  let instant: Temporal.Instant;
  try {
    instant = Temporal.PlainDateTime.from(sourceLocalDateTime)
      .toZonedDateTime(sourceTimezone, { disambiguation: 'reject' })
      .toInstant();
  } catch {
    throw new Error('nonexistent or ambiguous local time');
  }
  if (
    Temporal.Instant.compare(
      instant,
      Temporal.Instant.from(now.toISOString()),
    ) <= 0
  )
    throw new Error('schedule must be in the future');
  return {
    sourceLocalDateTime,
    sourceTimezone,
    publishAtUtc: instant.toString(),
  };
}

export function detectScheduleCollision(
  publishAtUtc: string,
  existingInstants: readonly string[],
  collisionConfirmed: boolean,
): { requiresConfirmation: boolean } {
  const candidate = Temporal.Instant.from(publishAtUtc).epochMilliseconds;
  return {
    requiresConfirmation:
      !collisionConfirmed &&
      existingInstants.some(
        (value) =>
          Math.abs(
            Temporal.Instant.from(value).epochMilliseconds - candidate,
          ) <= 300_000,
      ),
  };
}

export function decidePublicationVisibility(input: {
  requested: 'PRIVATE_REVIEW' | 'SCHEDULED';
  apiProjectVerified: boolean;
  schedule: PublishingSchedule | null;
}): PublicationVisibility {
  if (input.requested === 'SCHEDULED') {
    if (!input.apiProjectVerified)
      throw new Error('unverified API projects support private review only');
    if (!input.schedule)
      throw new Error('scheduled publication requires a schedule');
    return PublicationVisibility.Scheduled;
  }
  if (input.schedule)
    throw new Error('private review cannot include publishAt');
  return PublicationVisibility.PrivateReview;
}

export function visibilityRequiresSchedule(
  value: PublicationVisibility,
): boolean {
  switch (value) {
    case PublicationVisibility.PrivateReview:
      return false;
    case PublicationVisibility.Scheduled:
      return true;
    /* v8 ignore next -- TypeScript proves this switch exhaustive. */
    default:
      return assertNever(value);
  }
}

function assertNever(value: never): never {
  throw new Error(`unhandled publication visibility ${String(value)}`);
}
