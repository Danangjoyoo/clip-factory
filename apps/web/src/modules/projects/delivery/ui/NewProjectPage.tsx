'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createProject } from '../http/project-api.client';
import type { CreateProjectApiRequest } from '../../converters/api-entity/project.converter';
import { uploadProjectFile } from '../../../storage/delivery/http/upload-api.client';
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
  const [openAiApiKeyConfigured, setOpenAiApiKeyConfigured] = useState(false);
  useEffect(() => {
    void fetch('/api/settings')
      .then((response) => response.json())
      .then((settings) =>
        setOpenAiApiKeyConfigured(Boolean(settings.openAiApiKeyConfigured)),
      );
  }, []);
  const submit = async (value: NewProjectFormValue) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const project = await createProject(toCreateProjectRequest(value));
      if (value.sourceMethod === 'UPLOAD') {
        if (!value.file || !project.source?.id)
          throw new Error('UPLOAD_FAILED');
        await uploadProjectFile(project.id, project.source.id, value.file);
      }
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
      openAiApiKeyConfigured={openAiApiKeyConfigured}
      {...(error ? { submitError: error } : {})}
    />
  );
}
