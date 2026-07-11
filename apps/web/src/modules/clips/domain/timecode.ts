export class ClipEditError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'ClipEditError';
  }
}

const TIMECODE = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/u;

export function parseTimecode(value: string): number {
  const match = TIMECODE.exec(value);
  if (!match) throw new ClipEditError('INVALID_TIMECODE');
  const [hours, minutes, seconds, millis] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
  ];
  if (hours > 99 || minutes > 59 || seconds > 59)
    throw new ClipEditError('INVALID_TIMECODE');
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

export function formatTimecode(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 359_999_999)
    throw new ClipEditError('INVALID_TIMECODE');
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${(value % 1000).toString().padStart(3, '0')}`;
}
