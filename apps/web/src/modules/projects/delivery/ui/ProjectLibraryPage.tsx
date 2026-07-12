'use client';

import { useEffect, useState } from 'react';
import { listProjects, type ProjectApi } from '../http/project-api.client';
import { ProjectLibrary } from './ProjectLibrary';
import type { ProjectCardView } from './project.presentation';

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');

const sourceTone = (health: string): ProjectCardView['sourceHealthTone'] =>
  /MISSING|CHANGED|NOT_ALLOWED|INVALID/u.test(health)
    ? 'danger'
    : /UNKNOWN|RELINKING/u.test(health)
      ? 'warning'
      : 'neutral';

const money = (microusd: string) => {
  try {
    const cents = (BigInt(microusd) + 5_000n) / 10_000n;
    return `$${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
  } catch {
    return '—';
  }
};

export const projectApiToCard = (project: ProjectApi): ProjectCardView => ({
  id: project.id,
  name: project.name,
  href: `/projects/${project.id}/processing`,
  sourceHealthLabel: project.source
    ? `${titleCase(project.source.health)} · ${project.source.displayLabel}`
    : 'Source unavailable',
  sourceHealthTone: sourceTone(project.source?.health ?? 'UNKNOWN'),
  modeLabel: project.mode === 'MANUAL' ? 'Manual' : 'AI highlights',
  progressLabel: titleCase(project.status),
  etaLabel: null,
  candidateCount: null,
  renderCount: null,
  spendLabel: money(project.openaiSpendMicrousd),
  updatedLabel: new Date(project.updatedAt).toLocaleDateString(),
});

export function ProjectLibraryPage() {
  const [projects, setProjects] = useState<ProjectCardView[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listProjects(controller.signal)
      .then((values) => setProjects(values.map(projectApiToCard)))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError'))
          setError(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      {error ? (
        <p role="alert">Unable to load projects. Refresh to retry.</p>
      ) : null}
      <ProjectLibrary heading="Work in motion." projects={projects} />
    </>
  );
}
