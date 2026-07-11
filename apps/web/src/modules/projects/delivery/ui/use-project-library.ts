import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectApi, ProjectCardView } from './project.presentation';
import { projectApiToCardView } from './project.presentation';

type State = Readonly<{
  projects: readonly ProjectCardView[];
  isLoading: boolean;
  error: string | null;
}>;

type UseProjectLibrary = State & Readonly<{
  reload: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
}>;

const parseProjects = async (response: Response): Promise<ProjectCardView[]> => {
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('Invalid projects response');
  return payload.map((item) => projectApiToCardView(item as ProjectApi));
};

const readError = async (response: Response): Promise<string> => {
  const body = await response.text();
  if (!body) return `Request failed with status ${response.status}`;
  return body;
};

export function useProjectLibrary(): UseProjectLibrary {
  const [projects, setProjects] = useState<readonly ProjectCardView[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error(await readError(response));
      const nextProjects = await parseProjects(response);
      if (mounted.current) setProjects(nextProjects);
    } catch (loadError) {
      if (!mounted.current) return;
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load projects',
      );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    await reload();
  }, [reload]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);

  return {
    projects,
    isLoading,
    error,
    reload,
    deleteProject,
  };
}
