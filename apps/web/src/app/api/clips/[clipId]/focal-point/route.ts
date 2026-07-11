import { NextResponse } from 'next/server';

export async function POST(_request: Request, context: { params: Promise<{ clipId: string }> }) {
  const { clipId } = await context.params;
  return NextResponse.json({ code: 'FOCAL_POINT_NOT_CONFIGURED', clipId }, { status: 501 });
}
