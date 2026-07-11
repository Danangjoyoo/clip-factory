import { useState } from 'react';
import type { ProjectCardView } from './project.presentation';
export function useProjectLibrary(initial: readonly ProjectCardView[] = []) {
  const [projects, setProjects] = useState(initial);
  const remove = (id: string) =>
    setProjects((items) => items.filter((item) => item.id !== id));
  return { projects, remove };
}
