import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import type { OAuthConnectionWorkflowInputV1 } from '@clip-factory/contracts';

import type { WorkflowId } from '../../../../shared/domain';
import type { YouTubeConnectionId } from '../../application/dto/entity/youtube-publishing-entity.dto';
import type { YouTubeConnectionWorkflowScheduler } from '../../application/ports/youtube-connection-workflow-scheduler';

type WorkflowClientLike = {
  start(
    workflowType: string,
    options: {
      workflowId: string;
      taskQueue: string;
      args: readonly unknown[];
    },
  ): Promise<unknown>;
};

type WorkflowClientProvider =
  | WorkflowClientLike
  | (() => Promise<WorkflowClientLike>);

export class TemporalYouTubeConnectionWorkflowScheduler
  implements YouTubeConnectionWorkflowScheduler
{
  constructor(
    private readonly workflowClient: WorkflowClientProvider,
    private readonly taskQueue: string,
  ) {}

  startConnect(input: {
    connectionId: YouTubeConnectionId;
  }): Promise<WorkflowId> {
    const workflowId = youtubeConnectWorkflowId(input.connectionId);
    const payload: OAuthConnectionWorkflowInputV1 = {
      contractVersion: 1,
      connectionId: input.connectionId,
      requestedScopes: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
    };
    return this.startWorkflow('YouTubeOAuthWorkflow', workflowId, payload);
  }

  startDisconnect(input: {
    connectionId: YouTubeConnectionId;
  }): Promise<WorkflowId> {
    return this.startWorkflow(
      'YouTubeOAuthDisconnectWorkflow',
      youtubeDisconnectWorkflowId(input.connectionId),
      { connectionId: input.connectionId },
    );
  }

  private async startWorkflow(
    workflowType: string,
    workflowId: WorkflowId,
    payload: unknown,
  ): Promise<WorkflowId> {
    try {
      const workflowClient = await this.getWorkflowClient();
      await workflowClient.start(workflowType, {
        workflowId,
        taskQueue: this.taskQueue,
        args: [payload],
      });
    } catch (error) {
      if (!isAlreadyStarted(error)) {
        throw error;
      }
    }
    return workflowId;
  }

  private getWorkflowClient(): Promise<WorkflowClientLike> {
    if (typeof this.workflowClient === 'function') {
      return this.workflowClient();
    }
    return Promise.resolve(this.workflowClient);
  }
}

function youtubeConnectWorkflowId(
  connectionId: YouTubeConnectionId,
): WorkflowId {
  return `youtube-oauth:${connectionId}` as WorkflowId;
}

function youtubeDisconnectWorkflowId(
  connectionId: YouTubeConnectionId,
): WorkflowId {
  return `youtube-oauth-disconnect:${connectionId}` as WorkflowId;
}

function isAlreadyStarted(error: unknown): boolean {
  return (
    error instanceof WorkflowExecutionAlreadyStartedError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'WorkflowExecutionAlreadyStartedError')
  );
}
