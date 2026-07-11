import { clipsComposition } from '../../../../../modules/clips/composition/clips.composition';
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  return clipsComposition().controller.post(
    request,
    (await context.params).projectId,
  );
}
