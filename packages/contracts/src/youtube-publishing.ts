import type {
  OAuthConnectionWorkflowInputV1,
  OAuthConnectionWorkflowResultV1,
  PublicationProgressEventV1,
  PublicationWorkflowInputV1,
  YouTubeConnectionEventV1,
} from './generated/youtube-publishing';
import { validateContractDefinition } from './validate';

export const parseOAuthConnectionWorkflowInputV1 = (value: unknown) =>
  validateContractDefinition<OAuthConnectionWorkflowInputV1>(
    'youtube-publishing',
    'oauthConnectionWorkflowInputV1',
    value,
  );

export const parseOAuthConnectionWorkflowResultV1 = (value: unknown) =>
  validateContractDefinition<OAuthConnectionWorkflowResultV1>(
    'youtube-publishing',
    'oauthConnectionWorkflowResultV1',
    value,
  );

export const parseYouTubeConnectionEventV1 = (value: unknown) =>
  validateContractDefinition<YouTubeConnectionEventV1>(
    'youtube-publishing',
    'youTubeConnectionEventV1',
    value,
  );

export const parsePublicationWorkflowInputV1 = (value: unknown) =>
  validateContractDefinition<PublicationWorkflowInputV1>(
    'youtube-publishing',
    'publicationWorkflowInputV1',
    value,
  );

export const parsePublicationProgressEventV1 = (value: unknown) =>
  validateContractDefinition<PublicationProgressEventV1>(
    'youtube-publishing',
    'publicationProgressEventV1',
    value,
  );
