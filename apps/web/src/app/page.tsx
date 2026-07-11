'use client';

import ProjectLibrary from '../modules/projects/delivery/ui/ProjectLibrary';
import { useProjectLibrary } from '../modules/projects/delivery/ui/use-project-library';

export default function HomePage() {
  const { projects, isLoading, error, reload, deleteProject } = useProjectLibrary();

  return (
    <ProjectLibrary
      projects={projects}
      isLoading={isLoading}
      error={error}
      onRetry={reload}
      onDelete={deleteProject}
    />
  );
}
