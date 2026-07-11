import { projectsComposition } from '../../../modules/projects/composition/projects.composition';
export async function POST(request: Request) {
  return projectsComposition().controller.create(request);
}
export async function GET() {
  return projectsComposition().controller.list();
}
