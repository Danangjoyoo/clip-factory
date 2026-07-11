export type ProjectCardView = Readonly<{
  id: string; name: string; href: string; sourceHealthLabel: string;
  sourceHealthTone: 'neutral' | 'warning' | 'danger'; modeLabel: string;
  progressLabel: string; etaLabel: string | null; candidateCount: number;
  renderCount: number; spendLabel: string; updatedLabel: string;
}>;
