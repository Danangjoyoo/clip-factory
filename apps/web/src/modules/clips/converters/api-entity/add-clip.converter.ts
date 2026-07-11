import type { AddClipApiDto } from '../../delivery/http/dto/api/add-clip-api.dto';
import type { AddManualClipEntityRequest, ClipEntityDto } from '../../application/dto/entity';
export const addClipApiToEntity = (projectId: string, api: AddClipApiDto, idempotencyKey?: string): AddManualClipEntityRequest => ({ projectId, startTimecode: api.start, endTimecode: api.end, ...(idempotencyKey ? { idempotencyKey } : {}) });
export const clipEntityToApi = (clip: ClipEntityDto) => ({ ...clip, selectionCostMicrousd: clip.selectionCostMicrousd.toString(), createdAt: clip.createdAt.toISOString(), updatedAt: clip.updatedAt.toISOString() });
