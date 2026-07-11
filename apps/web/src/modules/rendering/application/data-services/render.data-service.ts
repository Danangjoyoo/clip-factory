import type { RenderRepository } from '../ports/render.repository';
export class RenderDataService {
  constructor(private readonly repository: RenderRepository) {}
  findById(id: string) { return this.repository.findById(id); }
  save(render: Parameters<RenderRepository['save']>[0]) { return this.repository.save(render); }
}
