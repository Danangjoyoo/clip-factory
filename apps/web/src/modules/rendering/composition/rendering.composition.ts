import { RenderDataService } from '../application/data-services/render.data-service';
import { PrismaRenderRepository } from '../adapters/persistence/repositories/prisma-render.repository';
import { RenderController } from '../delivery/http/render.controller';
export const renderingComposition = () => {
  const repository = new PrismaRenderRepository();
  return new RenderController(new RenderDataService(repository));
};
