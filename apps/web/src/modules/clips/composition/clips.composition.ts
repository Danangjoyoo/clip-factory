import { ProjectDataService } from '../../projects/application/data-services/project.data-service';
import { SourceAssetDataService } from '../../projects/application/data-services/source-asset.data-service';
import { PrismaProjectRepository } from '../../projects/adapters/persistence/repositories/prisma-project.repository';
import { PrismaSourceAssetRepository } from '../../projects/adapters/persistence/repositories/prisma-source-asset.repository';
import { PrismaClipRepository } from '../adapters/persistence/repositories/prisma-clip.repository';
import { ClipDataService } from '../application/data-services/clip.data-service';
import type { ClipPreparationPort } from '../application/ports/clip-preparation.port';
import { AddManualClipService } from '../application/services/add-manual-clip.service';
import { ClipController } from '../delivery/http/clip.controller';
import { prisma } from '../../../infrastructure/prisma/client';
import { wordsInRange } from '../../transcription/composition/transcript-artifact';

const localRenderPreparation: ClipPreparationPort = {
  async prepare(value) {
    const clip = await prisma.clip.findUnique({
      where: { id: value.clipId },
      select: { id: true, projectId: true, startMs: true, endMs: true },
    });
    if (!clip) return;
    const existing = await prisma.render.findFirst({
      where: { clipId: clip.id, status: 'COMPLETED' },
      select: { id: true },
    });
    if (existing) return;
    await prisma.render.create({
      data: {
        projectId: clip.projectId,
        clipId: clip.id,
        status: 'COMPLETED',
        inputSnapshotJson: { clipId: clip.id, localManual: true },
        outputObjectKey: `renders/${clip.projectId}/${clip.id}.mp4`,
        srtObjectKey: `renders/${clip.projectId}/${clip.id}.srt`,
        probeJson: { width: 1080, height: 1920 },
        encoder: 'local-manual',
        startedAt: new Date(),
        finishedAt: new Date(),
        durationMs: clip.endMs - clip.startMs,
      },
    });
  },
};

export function clipsComposition() {
  const service = new AddManualClipService(
    new ProjectDataService(new PrismaProjectRepository()),
    new SourceAssetDataService(new PrismaSourceAssetRepository()),
    { wordsInRange },
    new ClipDataService(new PrismaClipRepository()),
    localRenderPreparation,
  );
  return { controller: new ClipController(service) };
}
