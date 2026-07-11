// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface WorkflowResult {
  schemaVersion: '1.0.0';
  workflowId: string;
  projectId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  transcriptObject: {
    bucket: 'clip-factory';
    key: string;
    versionId: string | null;
    sha256: string;
  } | null;
  clipIds: string[];
  error: {
    code: string;
    category: 'RETRYABLE' | 'NON_RETRYABLE' | 'WAITING' | 'CANCELLED';
    retryable: boolean;
    message: string;
    requiredAction: string | null;
    details: {
      [k: string]: unknown;
    };
  } | null;
  completedAt: string;
}
