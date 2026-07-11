// Generated from Clip Factory contract 1.0.0. Do not edit.

export interface WorkerHealth {
  schemaVersion: '1.0.0';
  workerId: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  hardware: {
    architecture: 'arm64';
    chip: string;
    memoryBytes: number;
  };
  ffmpegVersion: string;
  transcriber: {
    backend: 'MLX_WHISPER' | 'FAKE';
    model: string;
    revision: string;
    weightsSha256: string | null;
    cacheStatus: 'READY' | 'MISSING' | 'INVALID' | 'NOT_APPLICABLE';
  };
  openAiConfigured: boolean;
  openAiModelAccess: {
    modelId: 'gpt-5.6-sol' | 'gpt-5.5';
    status: 'AVAILABLE' | 'NOT_ENTITLED' | 'NOT_FOUND' | 'UNKNOWN';
    checkedAt: string | null;
  }[];
  heartbeatAt: string;
}
