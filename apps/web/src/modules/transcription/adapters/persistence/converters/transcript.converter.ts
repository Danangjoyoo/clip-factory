import type { TranscriptEntityDto } from '../../../application/dto/entity';
import type { TranscriptRecordDto } from '../dto/record/transcript-record.dto';
export const transcriptRecordToEntity = (r: TranscriptRecordDto): TranscriptEntityDto => ({ ...r });
export const transcriptEntityToRecord = (e: Omit<TranscriptEntityDto, 'id' | 'createdAt'>) => ({ ...e });
