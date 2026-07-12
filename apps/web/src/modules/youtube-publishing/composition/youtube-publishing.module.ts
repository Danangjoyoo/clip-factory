import { prisma } from '../../../infrastructure/prisma/client';
import { PrismaPublishingMetadataDraftRepository } from '../adapters/persistence/repositories/prisma-publishing-metadata-draft.repository';
import { PrismaPublicationAttemptRepository } from '../adapters/persistence/repositories/prisma-publication-attempt.repository';
import { PrismaPublicationRepository } from '../adapters/persistence/repositories/prisma-publication.repository';
import { PrismaYouTubeConnectionRepository } from '../adapters/persistence/repositories/prisma-youtube-connection.repository';
import { PublishingMetadataDraftDataService } from '../application/data-services/publishing-metadata-draft.data-service';
import { PublicationAttemptDataService } from '../application/data-services/publication-attempt.data-service';
import { PublicationDataService } from '../application/data-services/publication.data-service';
import { YouTubeConnectionDataService } from '../application/data-services/youtube-connection.data-service';

export const youtubePublishingComposition = {
  connections: new YouTubeConnectionDataService(
    new PrismaYouTubeConnectionRepository(prisma),
  ),
  publishingMetadataDrafts: new PublishingMetadataDraftDataService(
    new PrismaPublishingMetadataDraftRepository(prisma),
  ),
  publications: new PublicationDataService(
    new PrismaPublicationRepository(prisma),
  ),
  publicationAttempts: new PublicationAttemptDataService(
    new PrismaPublicationAttemptRepository(prisma),
  ),
};

export function youtubePublishingModule() {
  return youtubePublishingComposition;
}
