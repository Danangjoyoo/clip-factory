import { describe, expect, it, vi } from 'vitest';

import type { WorkflowId, YouTubeConnectionId } from '../../../../shared/domain';
import { TemporalYouTubeConnectionWorkflowScheduler } from './temporal-youtube-connection-workflow-scheduler';

const connectionId =
  '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42' as YouTubeConnectionId;

describe('TemporalYouTubeConnectionWorkflowScheduler', () => {
  it('starts connect workflow with UUID-only generated contract payload', async () => {
    const client = {
      start: vi.fn().mockResolvedValue({ workflowId: 'ignored' }),
    };
    const scheduler = new TemporalYouTubeConnectionWorkflowScheduler(
      client,
      'youtube-oauth',
    );

    await expect(scheduler.startConnect({ connectionId })).resolves.toBe(
      `youtube-oauth:${connectionId}`,
    );

    expect(client.start).toHaveBeenCalledWith('YouTubeOAuthWorkflow', {
      workflowId: `youtube-oauth:${connectionId}`,
      taskQueue: 'youtube-oauth',
      args: [
        {
          contractVersion: 1,
          connectionId,
          requestedScopes: [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly',
          ],
        },
      ],
    });
    expect(JSON.stringify(client.start.mock.calls[0])).not.toMatch(
      /token|secret|codeVerifier|authorizationCode/i,
    );
  });

  it('returns deterministic workflow id when Temporal reports an existing run', async () => {
    const client = {
      start: vi.fn().mockRejectedValue(
        Object.assign(new Error('already started'), {
          name: 'WorkflowExecutionAlreadyStartedError',
        }),
      ),
    };
    const scheduler = new TemporalYouTubeConnectionWorkflowScheduler(
      client,
      'youtube-oauth',
    );

    await expect(scheduler.startConnect({ connectionId })).resolves.toBe(
      `youtube-oauth:${connectionId}` as WorkflowId,
    );
  });
});
