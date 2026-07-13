import { z } from 'zod';

export type YouTubeConnectionApiDto = {
  id: string | null;
  channel: {
    id: string;
    title: string;
    handle: string | null;
    avatarUrl: string | null;
  } | null;
  grantedScopes: readonly string[];
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'REAUTH_REQUIRED';
  oauthMode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
  refreshTokenExpiresAt: string | null;
  testingExpiryWarning: string | null;
  revocationUncertain: boolean;
  workerAvailable: boolean;
};

export const connectYouTubeRequestSchema = z.object({}).strict();
export const disconnectYouTubeRequestSchema = z.object({}).strict();
