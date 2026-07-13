export const defaults = {
  sourceMethod: 'FILEPATH',
  name: '',
  aiMode: 'PARTIAL',
  language: 'en',
  model: 'gpt-5.6-sol',
  reasoning: 'high',
  maximumSpendUsd: '5.00',
  maximumClips: 5,
  maximumClipSeconds: 60,
  instruction: '',
  platform: 'YOUTUBE_SHORTS',
} as const;
export type AiAssistedMode = 'MANUAL' | 'PARTIAL' | 'ADVANCED' | 'COMPLETE';
export const aiModeCopy = {
  MANUAL:
    'No OpenAI calls. Clip selection, metadata, and publishing details are manual.',
  PARTIAL:
    'AI suggests highlight candidates for clip editing. Captions and publishing stay manual.',
  ADVANCED: 'AI suggests highlights and drafts YouTube metadata for review.',
  COMPLETE:
    'AI suggests highlights, metadata, and publishing times. You must still confirm every schedule and upload.',
} as const;
export const projectModeFor = (mode: AiAssistedMode) =>
  mode === 'MANUAL' ? 'MANUAL' : 'AI_HIGHLIGHTS';
export const models = {
  'gpt-5.6-sol': ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
  'gpt-5.5': ['none', 'low', 'medium', 'high', 'xhigh'],
} as const;
export type ModelId = keyof typeof models;
export type Reasoning = (typeof models)[ModelId][number];
export type CatalogView = {
  models?: Partial<
    Record<ModelId, { available?: boolean; maxOutputTokens?: number }>
  >;
};
export const isAbsolutePath = (value: string) =>
  /^(?:[A-Za-z]:[\\/]|\\\\|\/)/u.test(value);
export const validateForm = (value: {
  sourceMethod: string;
  path: string;
  spend: string;
  maximumClips: number;
  maximumClipSeconds: number;
  instruction: string;
}) => ({
  path:
    value.sourceMethod === 'FILEPATH' && !isAbsolutePath(value.path)
      ? 'Enter an absolute filepath.'
      : undefined,
  spend: !/^\d+(?:\.\d{1,2})?$/u.test(value.spend)
    ? 'Enter a non-negative amount with at most two decimals.'
    : undefined,
  maximumClips:
    value.maximumClips < 1 || value.maximumClips > 50
      ? 'Choose 1–50 clips.'
      : undefined,
  maximumClipSeconds:
    value.maximumClipSeconds < 1 || value.maximumClipSeconds > 10800
      ? 'Choose 1–10800 seconds.'
      : undefined,
  instruction:
    value.instruction.length > 2000
      ? 'Instruction must be 2000 characters or fewer.'
      : undefined,
});
