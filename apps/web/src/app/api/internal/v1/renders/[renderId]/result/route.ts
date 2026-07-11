import { NextResponse } from 'next/server';
export async function POST(request: Request, context: { params: Promise<{ renderId: string }> }) { const { renderId } = await context.params; const body = await request.json(); return NextResponse.json({ renderId, accepted: Boolean(body) }, { status: 202 }); }
