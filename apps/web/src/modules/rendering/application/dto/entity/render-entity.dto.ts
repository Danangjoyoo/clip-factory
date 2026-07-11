import type { RenderSpecEntityDto } from '../../../../clips/application/dto/entity/render-spec-entity.dto';
export interface RenderEntityDto extends RenderSpecEntityDto {
  readonly status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  readonly outputKey?: string | null;
  readonly errorCode?: string | null;
}
