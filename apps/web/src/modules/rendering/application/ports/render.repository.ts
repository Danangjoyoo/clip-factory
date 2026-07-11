import type { RenderEntityDto } from '../dto/entity';
export interface RenderRepository {
  findById(id: string): Promise<RenderEntityDto | null>;
  save(render: RenderEntityDto): Promise<RenderEntityDto>;
}
