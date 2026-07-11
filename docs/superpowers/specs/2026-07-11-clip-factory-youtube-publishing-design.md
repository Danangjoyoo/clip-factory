# Clip Factory YouTube Publishing Design

**Status:** Approved in collaborative design review on 2026-07-11

**Implementation phase:** Phase 2, after the core MVP acceptance gate

**Depends on:** [Clip Factory Core MVP Design](./2026-07-11-clip-factory-core-design.md)

**Related:** [Decision log](./2026-07-11-clip-factory-decision-log.md)

## 1. Summary

Phase 2 adds a project-level YouTube publishing workspace. It connects one YouTube channel through a secure native desktop OAuth flow, generates editable publishing metadata from individual clip transcripts, uploads selected rendered clips privately, and—after the Google/YouTube verification requirements are satisfied—supports independent scheduled publication for every clip.

Publishing is always an explicit user action. Rendering a clip never uploads it automatically.

## 2. Goals

- Connect the user’s YouTube channel without exposing OAuth tokens to Docker, the browser, Git, logs, Redis, PostgreSQL, or MinIO.
- Show all rendered project clips in a switchable gallery/list publishing workspace.
- Generate editable title, description, hashtags, and keyword tags with separately tracked OpenAI usage.
- Upload each selected clip with its reviewed metadata.
- Give every clip its own visibility, timezone, schedule, YouTube status, and error history.
- Delegate scheduled publication to YouTube so Clip Factory can be offline at publish time.
- Preserve YouTube IDs/URLs and publication history in the project.
- Make API verification, Shorts classification, and thumbnail limitations explicit.

## 3. Non-Goals

- Downloading YouTube source videos.
- Automatically publishing immediately after render.
- Managing multiple channels in the first publishing version.
- Analytics ingestion, comment moderation, or subscriber management.
- Broad YouTube account administration.
- Guaranteeing that YouTube uses a custom thumbnail for a Short.
- Bypassing YouTube API quota, project verification, policy, copyright, or Content ID restrictions.
- Uploading to Instagram or TikTok.

## 4. YouTube Platform Constraints

- The Data API has no explicit “Short” upload flag. YouTube classifies eligible square/vertical videos up to three minutes as Shorts.
- Clip Factory’s YouTube preset validates 9:16 and a maximum of 180 seconds before enabling upload.
- YouTube states that custom thumbnails cannot be uploaded for Shorts in the same way as long-form videos. Clip Factory may retain a cover asset and expose a supported thumbnail attempt only where the account/video permits it, but the UI never promises Shorts thumbnail placement.
- API projects that have not passed YouTube’s compliance audit are restricted to private uploads.
- Google OAuth app verification and YouTube API compliance audit are separate processes.
- Content ID, strikes, channel settings, region restrictions, and YouTube policy may reject or limit an upload independently of Clip Factory.

## 5. Publishing Workspace UX

The project navigation adds a `YouTube` tab after Phase 2 is enabled.

### Gallery/list switch

- Gallery view emphasizes poster, duration, title, and publication state.
- List view exposes sortable columns for clip, origin, metadata state, selected model/reasoning, AI cost, upload state, visibility, scheduled time, timezone, and YouTube URL.
- The view preference is stored locally for the single user.

### Per-clip state

Every card/row shows:

- Preview poster and duration.
- AI or Manual clip origin.
- Reviewed title.
- Metadata-generation model/reasoning and exact cost.
- Current publishing state.
- Independent date/time/timezone.
- Last upload/processing error.
- YouTube URL when available.

Clicking a clip opens its publishing editor. Batch actions operate only on explicitly selected clips and require confirmation.

## 6. Metadata Generation

The publishing editor contains editable fields for:

- Title, validated to YouTube’s 100-character constraint.
- Description, validated to YouTube’s 5000-byte constraint.
- Hashtags, inserted into the reviewed title or description rather than treated as a separate API field.
- Keyword tags, stored separately and validated to the API’s aggregate limit.
- Category.
- Default metadata language.
- Audience / made-for-kids declaration.
- Optional synthetic-media declaration when applicable.
- Visibility and schedule.

`Generate draft` is a per-clip paid action. It uses the clip transcript, project context, and optional publishing instruction. The user selects a supported OpenAI model, reasoning level, and action-specific maximum cost. The app displays a conservative estimate and does not call OpenAI without confirmation.

The result is a draft only. Existing reviewed fields are never overwritten silently. Regeneration creates a new draft version and keeps provenance.

Each call creates an exact `AIUsageEvent` linked to the clip and metadata draft. Manual metadata editing has no OpenAI cost.

Metadata generation inherits the core design's paid-call reservation and `PAID_CALL_UNCERTAIN` policy. An ambiguous post-transmission outcome never regenerates automatically, never overwrites the current draft, and requires a separately confirmed fresh reservation with possible prior spend disclosed.

Hashtag generation follows YouTube policy:

- Hashtags must relate directly to clip content.
- Hashtags contain no spaces.
- The generator uses a small relevant set and never approaches YouTube’s 60-hashtag ignore threshold.
- Metadata is reviewed by the user before upload.

## 7. OAuth Application Configuration

The user creates a Google Cloud project, enables YouTube Data API v3, configures the OAuth consent screen, and creates a Desktop OAuth client.

The downloaded client configuration lives outside the repository in the user configuration directory with restrictive filesystem permissions. It is never stored in PostgreSQL, Redis, MinIO, the browser, or Git.

The first version requests these scopes in one consent flow:

- `https://www.googleapis.com/auth/youtube.upload` for uploads, initial metadata/schedule, and supported thumbnail operations.
- `https://www.googleapis.com/auth/youtube.readonly` to identify the authorized channel and check connection health.

The broad `youtube.force-ssl` scope is intentionally excluded. Consequently:

- All metadata and schedule changes are finalized before upload.
- Post-upload edits happen in YouTube Studio.
- A separate SRT caption-track upload is not part of the first publishing version; burned-in captions remain in the video.

A later permission expansion requires a new explicit design review because Google’s installed-app flow does not support incremental authorization in the same way as confidential web clients.

## 8. Native OAuth Flow

The native worker owns the complete OAuth lifecycle.

1. User clicks `Connect YouTube` in Next.js.
2. Next.js requests a connection session from the native worker using the authenticated internal channel.
3. Worker opens a listener on a random `127.0.0.1` port.
4. Worker generates:
   - High-entropy one-time `state` value.
   - PKCE verifier between 43 and 128 characters.
   - PKCE S256 challenge.
   - Ten-minute expiry.
5. Worker opens the Google authorization endpoint in the system browser. Embedded webviews and manual copy/paste codes are forbidden.
6. Google redirects to the exact loopback URI.
7. The listener accepts only one callback, validates state and expiry, rejects unexpected paths/hosts, and closes.
8. Worker exchanges the code and PKCE verifier directly with Google.
9. Worker verifies the granted scopes.
10. Refresh token is stored in macOS Keychain under an opaque connection UUID.
11. Access token remains memory-only and expires normally.
12. Worker queries the authorized channel identity and sends only sanitized connection metadata to Next.js.

OAuth codes, state, PKCE verifier, and access tokens are never logged. Query strings are excluded from callback request logs.

## 9. Token and Connection Storage

### macOS Keychain

- Refresh token.
- Optional proof/key material introduced by a future security upgrade.
- Keyed by Clip Factory service name and opaque connection UUID.

### Native worker memory

- Short-lived access token.
- Active OAuth code/state/verifier during the ten-minute flow.

### Redis

- Hashed one-time state and sanitized connection-flow progress with a ten-minute TTL.
- No token, authorization code, client secret, or PKCE verifier.

### PostgreSQL

`YouTubeConnection` stores:

- Opaque connection UUID.
- Channel ID, title, handle, and safe avatar URL/reference.
- Granted scope names.
- Connection status and health timestamps.
- Refresh-token expiry when Google returns it.
- OAuth consent/testing warning state.
- No credentials.

## 10. OAuth Lifecycle and Errors

| Condition | Behavior |
|---|---|
| Consent denied | Return to disconnected state; do not create a Keychain item |
| State mismatch/expiry | Reject callback, delete flow state, record a sanitized security event |
| Missing required scope | Store no usable connection; explain the missing capability |
| `invalid_grant` | Mark `REAUTH_REQUIRED`; pause YouTube jobs only |
| Access token expired | Refresh in native memory using Keychain refresh token |
| Testing refresh token nearing seven days | Show expiry warning and reconnect action |
| Workspace/admin policy denial | Show Google policy error; do not retry automatically |
| User disconnects | Revoke with Google, delete Keychain item, retain nonsecret publication history |
| Native worker offline | Disable connect/upload; preserve drafts and schedules not yet submitted |

Revoking the app does not cancel a video schedule already accepted and owned by YouTube.

## 11. Publishing Workflow

### 11.1 Preconditions

- Render status is successful.
- Output is 9:16 and at most 180 seconds for the YouTube Shorts preset.
- Channel connection is healthy.
- Metadata passes local limits and user approval.
- Visibility/schedule is valid for current project verification status.
- The user confirms the selected clips.

### 11.2 Temporal workflow per clip

1. Create immutable publication request snapshot.
2. Obtain/refresh a short-lived access token in the native worker.
3. Upload MP4 using YouTube’s resumable upload protocol.
4. Include reviewed title, description/hashtags, keyword tags, category, language, audience, visibility, and `publishAt` when permitted.
5. Record returned YouTube video ID.
6. Poll processing status with bounded backoff.
7. Attempt a thumbnail operation only when the endpoint/account/video supports it; failure does not delete the uploaded video.
8. Persist terminal `PRIVATE_REVIEW`, `SCHEDULED`, `PUBLISHED`, or `FAILED` state through the internal Next.js API.

Every clip has a separate workflow. One upload failure does not stop other selected clips.

## 12. Scheduling

- Each clip owns an independent schedule.
- User selects local date, time, and IANA timezone.
- PostgreSQL stores the source timezone and normalized UTC instant.
- Before upload, the UI detects past times and obvious duplicate schedule collisions but allows intentional close spacing after confirmation.
- Scheduling uploads the video as private and sets `status.publishAt`.
- YouTube, not Clip Factory, performs the future publication. Clip Factory can be offline.
- `publishAt` is used only for a private video that has never been published.
- Unverified API projects keep scheduling/public controls locked and provide a private-upload/Studio-review path.

## 13. Publication Data Model

| Record | Responsibility |
|---|---|
| `YouTubeConnection` | Nonsecret channel identity, scopes, health, OAuth testing/expiry state |
| `PublishingMetadataDraft` | Versioned generated/manual fields, approval state, model provenance |
| `Publication` | Clip, connection, immutable metadata snapshot, visibility, schedule, timezone, state, YouTube ID/URL |
| `PublicationAttempt` | Resumable session reference, attempt number, stage, progress, sanitized error, timestamps |
| `AIUsageEvent` | Exact cost and token usage for metadata generation |

A clip may have multiple historical publication attempts, but only one active publication per connection/video intent. Uniqueness and idempotency keys prevent duplicate local intents and repeated local mutations. The design does not claim provider-level exactly-once upload when YouTube has not returned a video ID.

## 14. Publication States

```text
DISCONNECTED
REAUTH_REQUIRED
METADATA_EMPTY
METADATA_DRAFT
AWAITING_APPROVAL
READY_TO_UPLOAD
UPLOADING
UPLOAD_OUTCOME_UNCERTAIN
YOUTUBE_PROCESSING
PRIVATE_REVIEW
SCHEDULED
PUBLISHED
FAILED
CANCELLED
```

Cancellation before YouTube returns a video ID stops the resumable session where possible. After a video ID exists, cancellation stops local polling but does not delete the remote video automatically.

Before transmitting the final resumable chunk, the attempt durably records that final dispatch is beginning. If the final response or returned video ID is lost, or a later session probe returns `404` after that marker, the publication enters `UPLOAD_OUTCOME_UNCERTAIN`. It does not automatically create a replacement session. The UI asks the user to inspect/reconcile the channel first; a replacement upload requires explicit acknowledgement that a duplicate remote video may exist. A `404` before any final-chunk dispatch may start a bounded replacement attempt because no completed-upload response is ambiguous.

## 15. Thumbnail Behavior

- Clip Factory can generate a cover asset from a user-selected frame with optional local text treatment.
- The cover is useful in Clip Factory, archives, and other platforms.
- The YouTube tab clearly states that Shorts do not support custom thumbnails like long-form uploads.
- A general `thumbnails.set` attempt is never treated as proof that the image will appear in every Shorts surface.
- Thumbnail failure is a warning attached to a successful upload, not an upload failure.

## 16. Privacy and Security

- OAuth opens only the system browser.
- Callback binds only to loopback on a random port and shuts down after one result or timeout.
- State and PKCE S256 are mandatory.
- Tokens never cross the internal boundary into Next.js.
- Publication workflows reference a connection UUID, never a token.
- All Google HTTP logs redact Authorization headers, query parameters, and response bodies that may contain credentials.
- Metadata and upload actions require explicit user confirmation.
- Google/YouTube errors are sanitized before persistence.
- Disconnect revokes provider access before deleting the local Keychain entry when network access permits; local deletion still occurs if revocation cannot complete, and the UI explains the remote-revocation uncertainty.

## 17. Testing

### Unit tests

- PKCE verifier/challenge generation.
- One-time state validation and expiry.
- Scope validation.
- Keychain adapter interface and redaction.
- Metadata constraints and hashtag policy rules.
- Timezone/UTC schedule conversion.
- Publication state transitions and idempotency.
- Resumable progress and retry policy.

### Integration tests

- Fake Google authorization/token server.
- Loopback callback happy path, denial, mismatch, timeout, missing scope, refresh, and `invalid_grant`.
- Keychain fake that proves no token enters PostgreSQL/Redis payloads.
- Fake YouTube resumable upload, processing, schedule, and thumbnail warning.
- Temporal restart during upload/polling without duplicate remote creation.

### Playwright tests

- Connect/disconnect UI and reconnect warning.
- Gallery/list preference.
- Metadata generation with fake OpenAI cost event.
- Manual metadata editing and approval.
- Different schedules for multiple clips.
- Private-only behavior for an unverified project.
- Independent successful/failed uploads.

### Real smoke test

- Explicit opt-in only.
- Dedicated private test video and test channel.
- Strictly private visibility until the user manually verifies the result.
- Never runs in default CI.

## 18. Acceptance Criteria

1. OAuth tokens are demonstrably absent from Docker, PostgreSQL, Redis, MinIO, browser storage, logs, diagnostics, fixtures, and Git.
2. A connected channel survives app/worker restart through Keychain refresh-token use.
3. Testing-mode token expiry produces `REAUTH_REQUIRED` without losing metadata drafts or local renders.
4. A user can switch gallery/list views and see every rendered project clip.
5. Metadata generation is editable, separately costed, and cannot publish without approval.
6. Three clips can be assigned three different timezone-aware schedules.
7. Private upload succeeds through resumable upload and records the YouTube ID/URL.
8. Unverified projects cannot be represented as capable of automatic public publication.
9. Scheduling is delegated to YouTube and remains valid while Clip Factory is offline.
10. A failed upload or thumbnail attempt does not corrupt other publication records.
11. Disconnect revokes/deletes credentials and leaves nonsecret history intact.
12. Architecture checks prove that Google/OpenAI SDK types, OAuth/token payloads, persistence records, and HTTP DTOs do not leak into domain or application boundaries.
13. Ambiguous OpenAI metadata-generation outcomes pause without an automatic retry or draft overwrite and require explicit authorization for a newly reserved attempt.
14. A lost final-upload result cannot start a replacement session automatically; it enters `UPLOAD_OUTCOME_UNCERTAIN` and requires reconciliation plus explicit duplicate-risk acknowledgement.

## 19. Clean Architecture and Boundary Rules

Phase 2 inherits every mandatory Clean Architecture, Clean Code, SOLID, DRY, testing, and automated-enforcement rule from the [core design](./2026-07-11-clip-factory-core-design.md). YouTube publishing is an isolated `youtube-publishing` feature module, not provider logic spread across project, clip, or UI modules.

### Application-owned ports

Publishing use cases depend on narrow application-owned ports, including:

- `YouTubeOAuthGateway` for authorization URL creation, code exchange, refresh, and revocation semantics.
- `CredentialVault` for opaque connection-scoped credential storage without exposing token material.
- `YouTubePublisher` for resumable upload, metadata update, scheduling, status polling, and best-effort thumbnail operations.
- `PublishingMetadataGenerator` for optional title, description, hashtag, and keyword generation with usage provenance.
- Clock, identifier, publication persistence, and workflow-scheduling ports scoped to the operations each use case needs.

Google API/OAuth SDKs, macOS Keychain APIs, OpenAI SDKs, Temporal clients, HTTP clients, and their generated types exist only in concrete adapters. The project YouTube tab, route handlers, and application services never invoke those SDKs directly. Composition roots select concrete implementations.

### Boundary models and persistence

- HTTP API Schema DTOs, publishing Entity DTOs/value objects, PostgreSQL Record DTOs, Google/OpenAI Client Schema DTOs, Temporal payloads, and UI view models remain separate.
- Explicit API-to-entity, entity-to-record, and client-to-entity converters validate state, scope, schedule, visibility, money, timestamps, provider identifiers, and sanitized errors.
- OAuth tokens are opaque adapter concerns. No domain/entity/API/persistence DTO contains an access token, refresh token, authorization code, PKCE verifier, or client secret.
- Each publication repository owns one table/entity boundary. Cross-record scheduling, approval, metadata generation, and upload policy belongs in application services.
- Temporal workflows contain deterministic state orchestration only; OAuth, Keychain, network, upload, OpenAI, clock, and PostgreSQL work occurs through activities/adapters.

### Enforcement and testability

- Import rules reject direct UI/controller/application imports of Google, OpenAI, Keychain, Prisma, or Temporal implementations and reject all dependency cycles.
- Port contract tests require production adapters and fakes to preserve the same idempotency, resumable-upload, cancellation, error, and redaction behavior.
- Converter tests cover provider enum/status changes, optional responses, malformed timestamps, missing scopes, sanitized errors, and money attribution.
- Domain/application tests use fakes and contain no Google, OpenAI, Keychain, Prisma, or Temporal setup. Adapter tests use fake provider servers or isolated platform integration fixtures.
- Shared abstractions are introduced only for stable product concepts. Similar Google, API, record, and entity shapes are not merged merely to remove duplicate fields.
- Broad `youtube.force-ssl` support remains deferred rather than widening an existing interface before a use case needs it.

## 20. External References

- [YouTube OAuth for desktop apps](https://developers.google.com/youtube/v3/guides/auth/installed-apps)
- [Google native-app OAuth and PKCE](https://developers.google.com/identity/protocols/oauth2/native-app)
- [YouTube video upload API](https://developers.google.com/youtube/v3/docs/videos/insert)
- [YouTube video metadata/update API](https://developers.google.com/youtube/v3/docs/videos/update)
- [YouTube thumbnail API](https://developers.google.com/youtube/v3/docs/thumbnails/set)
- [YouTube Shorts eligibility](https://support.google.com/youtube/answer/15424877?hl=en)
- [YouTube custom thumbnail guidance](https://support.google.com/youtube/answer/72431?hl=en-GB)
- [YouTube hashtag guidance](https://support.google.com/youtube/answer/6390658?hl=en)
