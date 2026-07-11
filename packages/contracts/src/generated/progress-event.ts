// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface ProgressEvent {
  schemaVersion: '1.0.0';
  workflowId: string;
  projectId: string;
  scope: 'ANALYSIS' | 'RENDER';
  stage: string;
  completedUnits: number;
  totalUnits: number;
  unit: 'BYTES' | 'MEDIA_MILLISECONDS' | 'WINDOWS' | 'FRAMES' | 'ITEMS';
  etaLowSeconds: number | null;
  etaHighSeconds: number | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_APPLICABLE';
  occurredAt: string;
}
