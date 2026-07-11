import type { TranscriptEntityDto } from '../../../../application/dto/entity';
export type TranscriptResultApiDto = Omit<TranscriptEntityDto, 'createdAt'> & { createdAt: string };
