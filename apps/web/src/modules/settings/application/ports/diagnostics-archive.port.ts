export interface DiagnosticsArchive { create(records: Record<string, unknown>[]): Promise<Uint8Array>; }
