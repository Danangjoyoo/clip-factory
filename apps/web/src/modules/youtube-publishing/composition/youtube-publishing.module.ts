import { PrismaYouTubeConnectionRepository } from '../adapters/persistence/repositories/prisma-youtube-connection.repository';
import { YouTubeConnectionDataService } from '../application/data-services/youtube-connection.data-service';

export const youtubePublishingComposition = {
  connections: new YouTubeConnectionDataService(
    new PrismaYouTubeConnectionRepository(),
  ),
};
