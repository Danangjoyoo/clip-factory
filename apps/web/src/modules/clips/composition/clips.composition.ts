import { ProjectDataService } from '../../projects/application/data-services/project.data-service';
import { SourceAssetDataService } from '../../projects/application/data-services/source-asset.data-service';
import { PrismaProjectRepository } from '../../projects/adapters/persistence/repositories/prisma-project.repository';
import { PrismaSourceAssetRepository } from '../../projects/adapters/persistence/repositories/prisma-source-asset.repository';
import { PrismaClipRepository } from '../adapters/persistence/repositories/prisma-clip.repository';
import { ClipDataService } from '../application/data-services/clip.data-service';
import { AddManualClipService } from '../application/services/add-manual-clip.service';
import { ClipController } from '../delivery/http/clip.controller';
export function clipsComposition() {
  const service = new AddManualClipService(
    new ProjectDataService(new PrismaProjectRepository()),
    new SourceAssetDataService(new PrismaSourceAssetRepository()),
    { wordsInRange: async () => [] },
    new ClipDataService(new PrismaClipRepository()),
    { prepare: async () => undefined },
  );
  return { controller: new ClipController(service) };
}
