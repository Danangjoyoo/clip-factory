import { ProjectSettingsView } from '../../../../modules/projects/delivery/ui/ProjectSettingsView';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <ProjectSettingsView
      value={{
        projectId,
        projectTitle: 'Project settings',
        instruction: '',
        sourceHealthLabel: 'Source ready',
        sourceLabel: 'Local filepath source',
        outputFrameLabel: 'Vertical 9:16 · 1080×1920',
        platformLabel: 'YouTube Shorts',
        maxDurationLabel: '45 seconds',
        captionStyleLabel: 'Bold lower third',
      }}
      onSaveGeneral={() => undefined}
      onRelinkSource={() => undefined}
      onSaveDefaults={() => undefined}
      onDeleteProject={() => undefined}
    />
  );
}
