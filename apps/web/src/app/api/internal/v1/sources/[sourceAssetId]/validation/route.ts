import { projectsComposition } from '../../../../../../../modules/projects/composition/projects.composition';
export async function POST(
  request: Request,
  context: { params: Promise<{ sourceAssetId: string }> },
) {
  return projectsComposition().workerSourceLocatorController.validate(
    request,
    (await context.params).sourceAssetId,
  );
}
