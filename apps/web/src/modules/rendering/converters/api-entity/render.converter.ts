import type { RenderEntityDto } from '../../application/dto/entity';
import type { RenderApiDto } from '../../delivery/http/dto/api/render-api.dto';
export const renderEntityToApi = (entity: RenderEntityDto): RenderApiDto => ({ renderId: entity.renderId, status: entity.status, outputKey: entity.outputKey ?? null, errorCode: entity.errorCode ?? null });
