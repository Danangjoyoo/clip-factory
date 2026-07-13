import { ProjectSettingsLocalPage } from '../../../../modules/projects/delivery/ui/ProjectSettingsView';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectSettingsLocalPage projectId={projectId} />;
}
