import type {
  UsageReportApiDto,
  UsageRow,
} from '../http/dto/api/usage-report-api.dto';
export type UsagePresentation = UsageReportApiDto;
export const money = (micros: bigint | string | number) => {
  const n = BigInt(micros);
  const sign = n < 0n ? '-' : '';
  const a = n < 0n ? -n : n;
  return `${sign}$${a / 1_000_000n}.${(a % 1_000_000n).toString().padStart(6, '0')}`;
};
export const rowText = (row: UsageRow, key: string) => String(row[key] ?? '—');
