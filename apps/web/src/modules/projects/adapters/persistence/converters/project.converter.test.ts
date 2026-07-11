import { expect, it } from 'vitest';
import {
  projectEntityToRecord,
  projectRecordToEntity,
} from './project.converter';

const dates = {
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};
it('maps every project record field without changing bigint, enums, or timestamps', () => {
  const record = {
    id: 'p1',
    name: 'Demo',
    mode: 'MANUAL',
    languageTag: 'en',
    defaultMaxClipSeconds: 60,
    defaultPlatformPreset: 'TIKTOK',
    status: 'COMPLETED',
    activeWorkflowId: null,
    openaiSpendMicrousd: 42n,
    ...dates,
  } as const;
  expect(projectRecordToEntity(record)).toEqual(record);
  expect(projectEntityToRecord(projectRecordToEntity(record))).toEqual({
    name: record.name,
    mode: record.mode,
    languageTag: record.languageTag,
    defaultMaxClipSeconds: record.defaultMaxClipSeconds,
    defaultPlatformPreset: record.defaultPlatformPreset,
    status: record.status,
    activeWorkflowId: null,
    openaiSpendMicrousd: record.openaiSpendMicrousd,
  });
});
