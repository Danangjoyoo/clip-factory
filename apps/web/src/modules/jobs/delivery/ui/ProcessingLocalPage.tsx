'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProcessingView } from './ProcessingView';
import type { ProcessingPresentation } from './processing.presentation';

const initial = (projectId: string): ProcessingPresentation => ({
  projectId,
  state: 'RUNNING',
  stage: 'Starting workflow',
  percent: 5,
  eta: 'ETA pending',
  stages: [],
  workerOnline: true,
  logs: ['Local workflow queued'],
  analysisVersion: 'local-workflow',
  analysisId: '',
});

export function ProcessingLocalPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [value, setValue] = useState(() => initial(projectId));

  useEffect(() => {
    let active = true;
    void fetch(`/api/projects/${projectId}/workflow`, { method: 'POST' })
      .then((response) => response.json())
      .then((result: { status?: string; editorHref?: string; error?: string }) => {
        if (!active) return;
        if (result.status === 'COMPLETED' && result.editorHref) {
          setValue((current) => ({
            ...current,
            state: 'COMPLETED',
            stage: 'Ready for review',
            percent: 100,
            eta: 'Complete',
            logs: [...current.logs, 'Editor assets ready'],
          }));
          router.push(result.editorHref);
          return;
        }
        setValue((current) => ({
          ...current,
          state: 'FAILED',
          stage: result.error ?? 'Workflow failed',
          percent: 100,
          eta: 'Failed',
          logs: [...current.logs, result.error ?? 'Workflow failed'],
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setValue((current) => ({
          ...current,
          state: 'FAILED',
          stage: error instanceof Error ? error.message : 'Workflow failed',
          percent: 100,
          eta: 'Failed',
        }));
      });
    return () => {
      active = false;
    };
  }, [projectId, router]);

  return <ProcessingView value={value} />;
}
