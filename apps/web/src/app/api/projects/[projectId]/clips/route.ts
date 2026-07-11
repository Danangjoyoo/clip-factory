import { clipsComposition } from '../../../../../modules/clips/composition/clips.composition';
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  return clipsComposition({ languageTag: async () => 'en', wordsInRange: async () => [], preparation: { prepare: async () => undefined } }).post(request, projectId);
}
