import { ProjectLibrary } from '../modules/projects/delivery/ui/ProjectLibrary';
export default function HomePage() {
  return (
    <ProjectLibrary
      projects={[]}
      onDelete={() => undefined}
      heading="Clip Factory"
    />
  );
}
