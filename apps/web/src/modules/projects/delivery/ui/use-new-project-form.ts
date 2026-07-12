import { useState } from 'react';
import {
  defaults,
  validateForm,
  type AiAssistedMode,
  type ModelId,
} from './new-project.presentation';
export type NewProjectFormValue = {
  name: string;
  sourceMethod: 'FILEPATH' | 'UPLOAD';
  aiMode: AiAssistedMode;
  language: string;
  model: ModelId;
  reasoning: string;
  maximumSpendUsd: string;
  maximumClips: number;
  maximumClipSeconds: number;
  instruction: string;
  platform: string;
  path: string;
  file: File | null;
};
export function useNewProjectForm(aiMode: AiAssistedMode = defaults.aiMode) {
  const [value, setValue] = useState<NewProjectFormValue>({
    ...defaults,
    aiMode,
    sourceMethod: 'UPLOAD',
    path: '',
    file: null,
  });
  const errors = validateForm({
    sourceMethod: value.sourceMethod,
    path: value.path,
    spend: value.maximumSpendUsd,
    maximumClips: value.maximumClips,
    maximumClipSeconds: value.maximumClipSeconds,
    instruction: value.instruction,
  });
  const update = (patch: Partial<NewProjectFormValue>) =>
    setValue((current) => ({ ...current, ...patch }));
  return {
    value,
    errors,
    update,
    valid:
      !Object.values(errors).some(Boolean) &&
      (value.sourceMethod !== 'UPLOAD' || Boolean(value.file)),
  };
}
