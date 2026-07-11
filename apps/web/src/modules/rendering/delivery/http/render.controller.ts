import type { RenderDataService } from '../../application/data-services/render.data-service';
import { renderEntityToApi } from '../../converters/api-entity/render.converter';
export class RenderController {
  constructor(private readonly renders: RenderDataService) {}
  async get(renderId: string) {
    const render = await this.renders.findById(renderId);
    return render ? renderEntityToApi(render) : null;
  }
}
