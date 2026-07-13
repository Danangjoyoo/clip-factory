import { Client, Connection } from '@temporalio/client';

import { loadServerEnv } from '../../../config/server-env';
import { prisma } from '../../../infrastructure/prisma/client';
import type { YouTubeConnectionId } from '../../../shared/domain';
import { TemporalYouTubeConnectionWorkflowScheduler } from '../adapters/clients/temporal-youtube-connection-workflow-scheduler';
import { PrismaPublishingMetadataDraftRepository } from '../adapters/persistence/repositories/prisma-publishing-metadata-draft.repository';
import { PrismaPublicationAttemptRepository } from '../adapters/persistence/repositories/prisma-publication-attempt.repository';
import { PrismaPublicationRepository } from '../adapters/persistence/repositories/prisma-publication.repository';
import { PrismaYouTubeConnectionRepository } from '../adapters/persistence/repositories/prisma-youtube-connection.repository';
import { PublishingMetadataDraftDataService } from '../application/data-services/publishing-metadata-draft.data-service';
import { PublicationAttemptDataService } from '../application/data-services/publication-attempt.data-service';
import { PublicationDataService } from '../application/data-services/publication.data-service';
import { YouTubeConnectionDataService } from '../application/data-services/youtube-connection.data-service';
import { ManageYouTubeConnectionService } from '../application/services/manage-youtube-connection.service';
import { YouTubeConnectionController } from '../delivery/http/youtube-connection.controller';

class HttpWorkerAvailability {
  constructor(private readonly url: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.url, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

const ids = {
  randomId: () => crypto.randomUUID() as YouTubeConnectionId,
};

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
  const env = loadServerEnv();
  const connections = youtubePublishingComposition.connections;
  const service = new ManageYouTubeConnectionService(
    connections,
    new TemporalYouTubeConnectionWorkflowScheduler(
      async () => {
        const temporalConnection = await Connection.connect({
          address: env.TEMPORAL_ADDRESS,
        });
        return new Client({ connection: temporalConnection }).workflow;
      },
      'clip-factory',
    ),
    new HttpWorkerAvailability(
      process.env.WORKER_VALIDATION_URL ?? 'http://127.0.0.1:8001',
    ),
    ids,
  );
  return {
    ...youtubePublishingComposition,
    connectionController: new YouTubeConnectionController(
      service,
      env.INTERNAL_SERVICE_TOKEN,
    ),
  };
}
