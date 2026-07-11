import { projectsComposition } from '../../../../../../../modules/projects/composition/projects.composition';
export async function GET(request: Request, context: { params: Promise<{ sourceAssetId: string }> }) {
  return projectsComposition().workerSourceLocatorController.get(request, (await context.params).sourceAssetId);
}
