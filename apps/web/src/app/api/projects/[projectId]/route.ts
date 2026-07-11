import { projectsComposition } from '../../../../modules/projects/composition/projects.composition';
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  return projectsComposition().controller.get((await context.params).projectId);
}
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  return projectsComposition().controller.remove(
    (await context.params).projectId,
  );
}
