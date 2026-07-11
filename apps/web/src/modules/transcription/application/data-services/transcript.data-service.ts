import type { TranscriptRepository } from '../ports/transcript.repository';
export class TranscriptDataService { constructor(private readonly repository: TranscriptRepository) {} insert(input: Parameters<TranscriptRepository['insert']>[0]) { return this.repository.insert(input); } getByProjectId(id: string) { return this.repository.findByProjectId(id); } }
