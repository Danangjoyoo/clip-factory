import { redactDiagnosticRecord } from '../../domain/redaction';
import type { DiagnosticsArchive } from '../ports/diagnostics-archive.port';
export class ExportDiagnosticsService { constructor(private readonly archive: DiagnosticsArchive) {} execute(records: Record<string, unknown>[]) { return this.archive.create(records.map(redactDiagnosticRecord)); } }
