import { PrismaRenderRepository } from '../../../../../modules/rendering/adapters/persistence/repositories/prisma-render.repository';
import { GetDownloadService } from '../../../../../modules/rendering/application/services/get-download.service';
import { DownloadController } from '../../../../../modules/rendering/delivery/http/download.controller';

const repository = new PrismaRenderRepository();

const presignPort = {
  async presign(objectKey: string, _ttlSeconds: number) {
    return `https://media.local/${encodeURIComponent(objectKey)}`;
  },
};

const controller = new DownloadController(
  new GetDownloadService(repository, presignPort),
);

export async function GET(_: Request, context: { params: Promise<{ renderId: string }> }) {
  const { renderId } = await context.params;
  return controller.get(renderId);
}
