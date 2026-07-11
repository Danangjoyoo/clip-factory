import { ProjectDataService } from '../../projects/application/data-services/project.data-service';
import { SourceAssetDataService } from '../../projects/application/data-services/source-asset.data-service';
import { PrismaProjectRepository } from '../../projects/adapters/persistence/repositories/prisma-project.repository';
import { PrismaSourceAssetRepository } from '../../projects/adapters/persistence/repositories/prisma-source-asset.repository';
import { PrismaClipRepository } from '../adapters/persistence/repositories/prisma-clip.repository';
import { ClipDataService } from '../application/data-services/clip.data-service';
import { AddManualClipService } from '../application/services/add-manual-clip.service';
import { UpdateClipEditService } from '../application/services/update-clip-edit.service';
import { ClipController } from '../delivery/http/clip.controller';
import { ClipEditController } from '../delivery/http/clip-edit.controller';

const platformCatalog = {
  YOUTUBE_SHORTS: { safeArea: { top: 0.08, bottom: 0.2 } },
  INSTAGRAM_REELS: { safeArea: { top: 0.1, bottom: 0.2 } },
  TIKTOK: { safeArea: { top: 0.06, bottom: 0.2 } },
} as const;

export function clipsComposition() {
  const service = new AddManualClipService(new ProjectDataService(new PrismaProjectRepository()), new SourceAssetDataService(new PrismaSourceAssetRepository()), { wordsInRange: async () => [] }, new ClipDataService(new PrismaClipRepository()), { prepare: async () => undefined });
  const editService = new UpdateClipEditService(
    async () => undefined,
    platformCatalog,
  );
  return {
    controller: new ClipController(service),
    editController: new ClipEditController(editService),
  };
}
