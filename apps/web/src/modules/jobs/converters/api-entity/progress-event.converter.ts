import type { ProgressPresentation } from '../../domain/progress';
import {
  ProgressEventApiSchema,
  type ProgressEventApiDto,
} from '../../delivery/http/dto/api/progress-event-api.dto';
export const progressEventToApi = (
  event: ProgressPresentation,
): ProgressEventApiDto => ProgressEventApiSchema.parse(event);
