import { prisma } from '../../../infrastructure/prisma/client';
import { PrismaPublishingMetadataDraftRepository } from '../adapters/persistence/repositories/prisma-publishing-metadata-draft.repository';
import { PrismaYouTubeConnectionRepository } from '../adapters/persistence/repositories/prisma-youtube-connection.repository';
import { PublishingMetadataDraftDataService } from '../application/data-services/publishing-metadata-draft.data-service';
import { YouTubeConnectionDataService } from '../application/data-services/youtube-connection.data-service';

export const youtubePublishingComposition = {
  connections: new YouTubeConnectionDataService(
    new PrismaYouTubeConnectionRepository(prisma),
  ),
  publishingMetadataDrafts: new PublishingMetadataDraftDataService(
    new PrismaPublishingMetadataDraftRepository(prisma),
  ),
};

export function youtubePublishingModule() {
  return youtubePublishingComposition;
}
