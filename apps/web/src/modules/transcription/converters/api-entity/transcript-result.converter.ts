import type { TranscriptEntityDto } from '../../application/dto/entity';
import type { TranscriptResultApiDto } from '../../delivery/http/dto/api/transcript-result-api.dto';
export const transcriptEntityToApi = (e: TranscriptEntityDto): TranscriptResultApiDto => ({ ...e, createdAt: e.createdAt.toISOString() });
