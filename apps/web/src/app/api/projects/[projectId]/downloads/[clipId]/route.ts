import { prisma } from '../../../../../../infrastructure/prisma/client';

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; clipId: string }> },
) {
  const { projectId, clipId } = await context.params;
  const render = await prisma.render.findFirst({
    where: { projectId, clipId, status: 'COMPLETED' },
    select: { id: true },
  });
  if (!render) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  return new Response(`local rendered mp4 ${render.id}\n`, {
    headers: {
      'content-type': 'video/mp4',
      'content-disposition': `attachment; filename="${clipId}.mp4"`,
    },
  });
}
