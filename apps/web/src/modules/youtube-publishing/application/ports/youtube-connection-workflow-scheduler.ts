import type { WorkflowId } from '../../../../shared/domain';
import type { YouTubeConnectionId } from '../dto/entity/youtube-publishing-entity.dto';

export interface YouTubeConnectionWorkflowScheduler {
  startConnect(input: { connectionId: YouTubeConnectionId }): Promise<WorkflowId>;
  startDisconnect(input: {
    connectionId: YouTubeConnectionId;
  }): Promise<WorkflowId>;
}
