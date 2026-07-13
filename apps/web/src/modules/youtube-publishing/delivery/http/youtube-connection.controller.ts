import { parseYouTubeConnectionEventV1 } from '@clip-factory/contracts';

import {
  authenticateInternalRequest,
  INTERNAL_UNAUTHORIZED,
} from '../../../../shared/delivery/http/internal-auth';
import type { ManageYouTubeConnectionService } from '../../application/services/manage-youtube-connection.service';
import {
  connectionEventContractToEntity,
  youtubeConnectionStartEntityToApi,
  youtubeConnectionStatusEntityToApi,
} from '../../converters/api-entity/youtube-connection.converter';
import {
  connectYouTubeRequestSchema,
  disconnectYouTubeRequestSchema,
} from './dto/api/youtube-connection-api.dto';

export class YouTubeConnectionController {
  constructor(
    private readonly service: ManageYouTubeConnectionService,
    private readonly internalWorkerToken: string,
  ) {}

  async connect(request: Request): Promise<Response> {
    if (!(await validEmptyBody(request, connectYouTubeRequestSchema))) {
      return Response.json(
        { code: 'INVALID_YOUTUBE_CONNECTION_REQUEST' },
        { status: 400 },
      );
    }
    try {
      const result = await this.service.connect();
      return Response.json(youtubeConnectionStartEntityToApi(result), {
        status: 202,
      });
    } catch (error) {
      return youtubeConnectionErrorResponse(error);
    }
  }

  async disconnect(request: Request): Promise<Response> {
    if (!(await validEmptyBody(request, disconnectYouTubeRequestSchema))) {
      return Response.json(
        { code: 'INVALID_YOUTUBE_CONNECTION_REQUEST' },
        { status: 400 },
      );
    }
    try {
      const result = await this.service.disconnect();
      return Response.json(youtubeConnectionStartEntityToApi(result), {
        status: 202,
      });
    } catch (error) {
      return youtubeConnectionErrorResponse(error);
    }
  }

  async get(): Promise<Response> {
    return Response.json(
      youtubeConnectionStatusEntityToApi(await this.service.get()),
      { status: 200 },
    );
  }

  async acceptInternalEvent(request: Request): Promise<Response> {
    if (
      !authenticateInternalRequest(
        request.headers.get('authorization'),
        this.internalWorkerToken,
      )
    ) {
      return Response.json(INTERNAL_UNAUTHORIZED, { status: 401 });
    }
    try {
      const event = parseYouTubeConnectionEventV1(await request.json());
      await this.service.acceptWorkerEvent(connectionEventContractToEntity(event));
      return new Response(null, { status: 204 });
    } catch {
      return Response.json(
        { code: 'INVALID_YOUTUBE_CONNECTION_EVENT' },
        { status: 400 },
      );
    }
  }
}

function youtubeConnectionErrorResponse(error: unknown): Response {
  const code = (error as { code?: unknown }).code;
  if (code === 'YOUTUBE_WORKER_OFFLINE') {
    return Response.json(
      {
        code,
        message: 'Start the native worker to connect or upload.',
      },
      { status: 503 },
    );
  }
  if (code === 'YOUTUBE_CONNECTION_NOT_CONNECTED') {
    return Response.json(
      {
        code,
        message: 'Connect a YouTube channel before disconnecting.',
      },
      { status: 409 },
    );
  }
  throw error;
}

async function validEmptyBody(
  request: Request,
  schema: typeof connectYouTubeRequestSchema,
): Promise<boolean> {
  try {
    return schema.safeParse(await request.json()).success;
  } catch {
    return false;
  }
}
