import type { ProgressPresentation } from '../../domain/progress';
import type { ProgressEventApiDto } from '../../delivery/http/dto/api/progress-event-api.dto';
export const progressEventToApi = (
  event: ProgressPresentation,
): ProgressEventApiDto => event;
