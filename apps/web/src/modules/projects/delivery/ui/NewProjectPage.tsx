'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createProject } from '../http/project-api.client';
import type { CreateProjectApiRequest } from '../../converters/api-entity/project.converter';
import { NewProjectForm } from './NewProjectForm';
import { projectModeFor } from './new-project.presentation';
import type { NewProjectFormValue } from './use-new-project-form';

export const toCreateProjectRequest = (
  value: NewProjectFormValue,
): CreateProjectApiRequest => {
  const source =
    value.sourceMethod === 'FILEPATH'
      ? { type: 'FILEPATH' as const, path: value.path }
      : value.file
        ? {
            type: 'UPLOAD' as const,
            fileName: value.file.name,
            sizeBytes: String(value.file.size),
          }
        : null;
  if (!source) throw new Error('Select a video file');
  return {
    name: value.name,
    mode: projectModeFor(value.aiMode),
    language: value.language,
    maxClipSeconds: value.maximumClipSeconds,
    platform: value.platform as CreateProjectApiRequest['platform'],
    source,
  };
};

export function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async (value: NewProjectFormValue) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const project = await createProject(toCreateProjectRequest(value));
      router.push(`/projects/${project.id}/processing`);
    } catch {
      setError('Unable to create project. Review source and try again.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <NewProjectForm
      onSubmit={submit}
      submitting={submitting}
      {...(error ? { submitError: error } : {})}
    />
  );
}
