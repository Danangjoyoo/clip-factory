export type ProjectCardView = Readonly<{
  id: string;
  name: string;
  href: string;
  sourceHealthLabel: string;
  sourceHealthTone: 'neutral' | 'warning' | 'danger';
  modeLabel: string;
  progressLabel: string;
  etaLabel: string | null;
  candidateCount: number;
  renderCount: number;
  spendLabel: string;
  updatedLabel: string;
}>;

export type ProjectSettingsViewModel = Readonly<{
  projectId: string;
  projectTitle: string;
  instruction: string;
  sourceHealthLabel: string;
  sourceLabel: string;
  outputFrameLabel: string;
  platformLabel: string;
  maxDurationLabel: string;
  captionStyleLabel: string;
}>;
