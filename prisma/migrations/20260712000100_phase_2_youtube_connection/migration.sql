create table "youtube_connections" (
  "id" uuid primary key,
  "slot" text not null default 'PRIMARY',
  "channel_id" text not null,
  "channel_title" text not null,
  "channel_handle" text,
  "avatar_url" text,
  "granted_scopes" jsonb not null,
  "state" text not null,
  "oauth_mode" text not null,
  "refresh_token_expires_at" timestamptz,
  "health_checked_at" timestamptz,
  "connected_at" timestamptz,
  "disconnected_at" timestamptz,
  "revocation_uncertain" boolean not null default false,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "youtube_connections_slot_check" check ("slot" = 'PRIMARY'),
  constraint "youtube_connections_state_check" check (
    "state" in ('DISCONNECTED', 'CONNECTED', 'REAUTH_REQUIRED')
  ),
  constraint "youtube_connections_oauth_mode_check" check (
    "oauth_mode" in ('TESTING', 'PRODUCTION', 'UNKNOWN')
  ),
  constraint "youtube_connections_scopes_array_check" check (
    jsonb_typeof("granted_scopes") = 'array'
  )
);

create unique index "youtube_connections_slot_key"
  on "youtube_connections" ("slot");
create unique index "youtube_connections_channel_id_key"
  on "youtube_connections" ("channel_id");
create index "youtube_connections_state_health_idx"
  on "youtube_connections" ("state", "health_checked_at" desc);
