import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ summary: { actual: '$0.000000', allocated: '$0.000000 allocated estimate — equal share', possible: 'Up to $0.000000 possible unreported provider charge' }, projects: [], analysisRuns: [], apiCalls: [], allocations: [], renders: [], models: [] }); }
