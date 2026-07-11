import { TextEncoder } from 'node:util';
import type { DiagnosticsArchive } from '../../application/ports/diagnostics-archive.port';
export class ZipDiagnosticsArchiveAdapter implements DiagnosticsArchive {
  async create(records: Record<string, unknown>[]) {
    return new TextEncoder().encode(JSON.stringify({ records }));
  }
}
