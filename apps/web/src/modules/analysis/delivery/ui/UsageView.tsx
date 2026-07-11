import type { UsagePresentation } from './usage.presentation';
import { CostSummary } from './CostSummary';
import { UsageTable } from './UsageTable';
import type { UsageRow } from '../http/dto/api/usage-report-api.dto';
const tables = [['projects','Projects'],['analysisRuns','Analysis runs'],['apiCalls','API calls'],['allocations','Allocations'],['renders','Renders'],['models','Model and pricing metadata']] as const;
export function UsageView({ report }: { report: UsagePresentation }) { return <main><h1>Usage and provenance</h1><CostSummary summary={report.summary} />{tables.map(([key, label]) => { const rows: UsageRow[] = report[key]; const columns = Object.keys(rows[0] ?? { id: 'ID' }).map(id => ({ id, header: id, cell: (row: UsageRow) => String(row[id] ?? '—'), sortValue: (row: UsageRow) => String(row[id] ?? '') })); return <UsageTable key={key} caption={label} rows={rows} columns={columns} />; })}</main>; }
