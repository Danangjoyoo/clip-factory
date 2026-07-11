// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface ErrorEnvelope {
  schemaVersion: '1.0.0';
  error: {
    code: string;
    category: 'RETRYABLE' | 'NON_RETRYABLE' | 'WAITING' | 'CANCELLED';
    retryable: boolean;
    message: string;
    requiredAction: string | null;
    details: {
      [k: string]: unknown;
    };
  };
}
