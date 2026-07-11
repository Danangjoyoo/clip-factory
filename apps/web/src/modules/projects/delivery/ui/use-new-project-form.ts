import { useState } from 'react';
import { defaults, validateForm, type ModelId } from './new-project.presentation';
type FormValue = { sourceMethod: 'FILEPATH' | 'UPLOAD'; discoverHighlights: boolean; language: string; model: ModelId; reasoning: string; maximumSpendUsd: string; maximumClips: number; maximumClipSeconds: number; instruction: string; platform: string; path: string; file: File | null };
export function useNewProjectForm() {
  const [value, setValue] = useState<FormValue>({ ...defaults, sourceMethod: 'FILEPATH', path: '', file: null });
  const errors = validateForm({ sourceMethod: value.sourceMethod, path: value.path, spend: value.maximumSpendUsd, maximumClips: value.maximumClips, maximumClipSeconds: value.maximumClipSeconds, instruction: value.instruction });
  const update = (patch: Partial<FormValue>) => setValue((current) => ({ ...current, ...patch }));
  return { value, errors, update, valid: !Object.values(errors).some(Boolean) };
}
