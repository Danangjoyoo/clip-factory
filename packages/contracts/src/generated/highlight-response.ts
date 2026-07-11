// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface HighlightResponse {
  schemaVersion: '1.0.0';
  analysisRunId: string;
  candidates: {
    startMs: number;
    endMs: number;
    title: string;
    rationale: string;
    rank: number;
    overallScore: number;
    scores: {
      hook: number;
      coherence: number;
      payoff: number;
      novelty: number;
      energy: number;
      instructionFit: number;
      boundaryQuality: number;
    };
  }[];
}
