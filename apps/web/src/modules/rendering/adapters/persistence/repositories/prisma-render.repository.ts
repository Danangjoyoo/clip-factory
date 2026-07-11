import type { RenderEntityDto } from '../../application/dto/entity';
import type { RenderRepository } from '../../application/ports/render.repository';
export class PrismaRenderRepository implements RenderRepository {
  private readonly rows = new Map<string, RenderEntityDto>();
  findById(id: string) { return Promise.resolve(this.rows.get(id) ?? null); }
  save(render: RenderEntityDto) { this.rows.set(render.renderId, render); return Promise.resolve(render); }
}
