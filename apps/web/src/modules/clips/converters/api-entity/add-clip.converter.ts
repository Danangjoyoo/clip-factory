import type { AddManualClipEntityRequest, ClipEntityDto } from '../../application/dto/entity';
import type { AddClipApiDto } from '../../delivery/http/dto/api/add-clip-api.dto';
export const addClipApiToEntity = (projectId: string, value: AddClipApiDto, idempotencyKey?: string): AddManualClipEntityRequest => ({ projectId, startTimecode: value.start, endTimecode: value.end, idempotencyKey });
export const clipEntityToApi = (value: ClipEntityDto) => ({ id: value.id, projectId: value.projectId, origin: value.origin, startMs: value.startMs, endMs: value.endMs, captionDocument: value.captionDocument, selectionCostMicrousd: value.selectionCostMicrousd.toString() });
