import { projectsComposition } from '../../../../../../modules/projects/composition/projects.composition';
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  return projectsComposition().relinkSourceController.post(request, projectId);
}
