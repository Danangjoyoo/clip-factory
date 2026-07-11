import { NextResponse } from 'next/server';
import { renderingComposition } from '../../../../../modules/rendering/composition/rendering.composition';
export async function GET(_: Request, context: { params: Promise<{ clipId: string }> }) { const { clipId } = await context.params; const render = await renderingComposition().get(clipId); return render ? NextResponse.json(render) : NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }); }
