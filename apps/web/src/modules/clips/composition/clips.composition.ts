import { ClipDataService } from '../application/data-services/clip.data-service';
import { AddManualClipService } from '../application/services/add-manual-clip.service';
import { PrismaClipRepository } from '../adapters/persistence/repositories/prisma-clip.repository';
import { ProjectDataService } from '../../projects/application/data-services/project.data-service';
import { SourceAssetDataService } from '../../projects/application/data-services/source-asset.data-service';
import { PrismaProjectRepository } from '../../projects/adapters/persistence/repositories/prisma-project.repository';
import { PrismaSourceAssetRepository } from '../../projects/adapters/persistence/repositories/prisma-source-asset.repository';
import { ClipController } from '../delivery/http/clip.controller';
export function clipsComposition(dependencies: ConstructorParameters<typeof AddManualClipService>[2] & { preparation: ConstructorParameters<typeof AddManualClipService>[4] }) {
  const projects = new ProjectDataService(new PrismaProjectRepository()); const sources = new SourceAssetDataService(new PrismaSourceAssetRepository()); const clips = new ClipDataService(new PrismaClipRepository());
  return new ClipController(new AddManualClipService(projects, sources, dependencies, clips, dependencies.preparation));
}
