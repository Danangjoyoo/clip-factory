export type YouTubeConnectionRecordState =
  | 'DISCONNECTED'
  | 'CONNECTED'
  | 'REAUTH_REQUIRED';

export type YouTubeConnectionRecordDto = {
  id: string;
  slot: 'PRIMARY';
  channel_id: string;
  channel_title: string;
  channel_handle: string | null;
  avatar_url: string | null;
  granted_scopes: readonly string[];
  state: YouTubeConnectionRecordState;
  oauth_mode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
  refresh_token_expires_at: Date | null;
  health_checked_at: Date | null;
  connected_at: Date | null;
  disconnected_at: Date | null;
  revocation_uncertain: boolean;
  created_at: Date;
  updated_at: Date;
};
