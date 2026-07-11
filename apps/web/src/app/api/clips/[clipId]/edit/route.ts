import { clipsComposition } from '../../../../../modules/clips/composition/clips.composition';

export async function PUT(
  request: Request,
  context: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await context.params;
  return clipsComposition().editController.put(request, clipId);
}
