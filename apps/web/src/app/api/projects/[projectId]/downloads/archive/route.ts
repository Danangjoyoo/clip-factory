import { ArchiveController } from '../../../../../../modules/rendering/delivery/http/archive.controller';
import { PrismaRenderRepository } from '../../../../../../modules/rendering/adapters/persistence/repositories/prisma-render.repository';
import { CreateArchiveService } from '../../../../../../modules/rendering/application/services/create-archive.service';
import { ArchiveBuilderPort } from '../../../../../../modules/rendering/application/ports/archive-builder.port';

const repository = new PrismaRenderRepository();

const builder: ArchiveBuilderPort = {
  async build(_projectId, outputKey) {
    return outputKey;
  },
};

const controller = new ArchiveController(
  new CreateArchiveService(repository, builder),
);

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const projectId = (await context.params).projectId;
  const body = await request.json();
  return controller.create(projectId, body);
}
