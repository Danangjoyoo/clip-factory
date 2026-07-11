import { UsageView } from '../../modules/analysis/delivery/ui/UsageView';
const empty = { actual: '$0.000000', allocated: '$0.000000 allocated estimate — equal share', possible: 'Up to $0.000000 possible unreported provider charge' };
export default function UsagePage() { return <UsageView report={{ summary: empty, projects: [], analysisRuns: [], apiCalls: [], allocations: [], renders: [], models: [] }} />; }
