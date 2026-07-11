import type { RenderSpecEntityDto } from '../../../../clips/application/dto/entity/render-spec-entity.dto';
export interface RenderEntityDto extends RenderSpecEntityDto {
  readonly projectId: string;
  readonly status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  readonly retryOfRenderId?: string | null;
  readonly outputKey?: string | null;
  readonly srtObjectKey?: string | null;
  readonly errorCode?: string | null;
}
