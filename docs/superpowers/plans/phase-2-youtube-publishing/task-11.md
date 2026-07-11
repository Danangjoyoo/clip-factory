# Task 11: YouTube Client DTOs and Resumable Publisher Adapter

> **Implementation mode:** Complete after Tasks 1, 2, and 6. This task supplies a provider adapter and contract tests; Task 12 owns Temporal orchestration and persistence callbacks.

## Purpose

Implement a narrow `YouTubePublisher` port over the official resumable upload protocol, processing-status polling, and best-effort thumbnail endpoint. The adapter must create private videos only, map Entity metadata through distinct Google Client DTOs, expose resumable offsets/idempotent results, and sanitize every provider error.

## Requirements and traceability

- YouTube design §§4, 7, 11–12: no Short flag, 9:16/180-second precondition, exact metadata on insert, private-first, `publishAt` only when verified, no post-upload edits.
- YouTube design §§13–16: resumable session/attempt progress, processing status, local idempotency without a false provider exactly-once claim, canonical `UPLOAD_OUTCOME_UNCERTAIN`, cancellation, warning-only thumbnail behavior, and redacted Google errors.
- Testing/acceptance: fake YouTube session/upload/poll/schedule/thumbnail, video ID/URL, isolated failure.
- Official protocol: session `POST` returns `Location`; chunk `PUT`; `308 Range`; empty status probe; `201` completion; transient `500/502/503/504`; expired-session `404`; nonfinal chunk multiple of 256 KiB.

## Clean Architecture ownership

- **Affected layers:** worker application-owned port, Google adapter-local Client DTOs/converters/errors, fake-provider contract tests.
- **Port:** granular provider operations; workflow/application code owns sequence/retry decisions.
- **Credential rule:** methods accept opaque connection UUID; adapter obtains a memory-only access token through Task 7's adapter-private token provider.
- **DTO rule:** Google request/response/status enums never leave `adapters/youtube` or `client_entity` converter.

## Files

- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/youtube_publisher.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/artifact_byte_source.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/youtube_client_dto.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/youtube_publisher.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/resumable_range.py`
- Create: `apps/worker/src/clip_factory/adapters/storage/minio_artifact_byte_source.py`
- Create: `apps/worker/src/clip_factory/converters/youtube_publishing/client_entity/youtube_video.py`
- Create: `apps/worker/tests/adapters/youtube/test_resumable_range.py`
- Create: `apps/worker/tests/adapters/youtube/test_youtube_video_converter.py`
- Create: `apps/worker/tests/adapters/youtube/test_youtube_publisher.py`
- Create: `apps/worker/tests/contracts/test_youtube_publisher_contract.py`
- Create: `apps/worker/tests/adapters/storage/test_minio_artifact_byte_source.py`
- Create: `tests/integration/youtube-publishing/test_fake_youtube_resumable_upload.py`
- Modify: `apps/worker/src/clip_factory/composition/worker_container.py`

## Prerequisites

- Task 2 validated metadata/schedule/visibility values are represented in Task 1's Temporal snapshot.
- Task 7 supplies memory-only token access and redacted HTTP execution.
- Phase 1 provides MinIO configuration/client construction but no byte-range read port. This task adds the application-owned `ArtifactByteSourcePort` and a narrow MinIO adapter; no local path or MinIO SDK type crosses it.

## Interfaces

Create `youtube_publisher.py` under ports:

```python
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Protocol


class ProcessingState(StrEnum):
    PROCESSING = 'PROCESSING'
    SUCCEEDED = 'SUCCEEDED'
    FAILED = 'FAILED'


@dataclass(frozen=True, slots=True)
class ResumableSession:
    reference: str


@dataclass(frozen=True, slots=True)
class UploadProgress:
    acknowledged_bytes: int
    completed_video_id: str | None
    retry_after_seconds: int | None


@dataclass(frozen=True, slots=True)
class ProcessingResult:
    state: ProcessingState
    progress_percent: int | None
    failure_code: str | None


@dataclass(frozen=True, slots=True)
class UploadReconciliationRequest:
    title: str
    description: str
    category_id: str
    duration_ms: int
    final_chunk_dispatched_at: datetime


@dataclass(frozen=True, slots=True)
class UploadReconciliationResult:
    result: str
    video_id: str | None
    video_url: str | None


@dataclass(frozen=True, slots=True)
class ThumbnailResult:
    applied: bool
    warning_code: str | None


class FinalUploadOutcomeUncertainError(RuntimeError):
    def __init__(self, safe_reason_code: str) -> None:
        super().__init__(safe_reason_code)
        self.safe_reason_code = safe_reason_code


@dataclass(frozen=True, slots=True)
class CreateYouTubeVideoRequest:
    title: str
    description: str
    hashtags: tuple[str, ...]
    keyword_tags: tuple[str, ...]
    category_id: str
    default_language: str
    made_for_kids: bool
    contains_synthetic_media: bool
    visibility: str
    publish_at: datetime | None
    api_project_verified: bool
    mime_type: str
    total_bytes: int


class YouTubePublisher(Protocol):
    async def create_session(
        self,
        connection_id: str,
        request: CreateYouTubeVideoRequest,
    ) -> ResumableSession:
        raise NotImplementedError

    async def query_session(
        self,
        connection_id: str,
        session: ResumableSession,
        total_bytes: int,
    ) -> UploadProgress:
        raise NotImplementedError

    async def upload_chunk(
        self,
        connection_id: str,
        session: ResumableSession,
        start: int,
        chunk: bytes,
        total_bytes: int,
    ) -> UploadProgress:
        raise NotImplementedError

    async def get_processing_status(
        self,
        connection_id: str,
        video_id: str,
    ) -> ProcessingResult:
        raise NotImplementedError

    async def reconcile_recent_upload(
        self,
        connection_id: str,
        request: UploadReconciliationRequest,
    ) -> UploadReconciliationResult:
        raise NotImplementedError

    async def set_thumbnail(
        self,
        connection_id: str,
        video_id: str,
        mime_type: str,
        image: bytes,
    ) -> ThumbnailResult:
        raise NotImplementedError
```

Create `artifact_byte_source.py`:

```python
from typing import Protocol

from clip_factory.ports.artifact_store import ObjectReference


class ArtifactByteSourcePort(Protocol):
    async def size(self, reference: ObjectReference) -> int:
        raise NotImplementedError

    async def read_range(
        self,
        reference: ObjectReference,
        start: int,
        end_exclusive: int,
    ) -> bytes:
        raise NotImplementedError
```

`CreateYouTubeVideoRequest.visibility` is validated on construction to the application values `PRIVATE_REVIEW` or `SCHEDULED`; it contains no Google enum or DTO.

## RED-GREEN-REFACTOR cycle 1: resumable range parsing and client conversion

- [ ] **RED 1.1 — Write range tests first.**

`test_resumable_range.py`:

```python
import pytest

from clip_factory.adapters.youtube.resumable_range import acknowledged_bytes_from_range


@pytest.mark.parametrize(
    ('header', 'expected'),
    [(None, 0), ('bytes=0-0', 1), ('bytes=0-999999', 1_000_000)],
)
def test_acknowledged_bytes_are_last_index_plus_one(header: str | None, expected: int) -> None:
    assert acknowledged_bytes_from_range(header, total_bytes=2_000_000) == expected


@pytest.mark.parametrize('header', ['bytes=1-9', 'bytes=0-x', 'bytes=0-2000000', 'items=0-1'])
def test_rejects_malformed_or_noncontiguous_ranges(header: str) -> None:
    with pytest.raises(ValueError, match='invalid resumable Range header'):
        acknowledged_bytes_from_range(header, total_bytes=2_000_000)
```

`test_youtube_video_converter.py` must assert this exact scheduled client request:

```python
def test_scheduled_entity_maps_to_private_google_insert_request() -> None:
    client = create_video_entity_to_client(make_create_video_request(
        visibility='SCHEDULED',
        api_project_verified=True,
        publish_at=datetime(2026, 7, 12, 0, 30, tzinfo=UTC),
    ))
    assert client.model_dump(exclude_none=True) == {
        'snippet': {
            'title': 'Reviewed title',
            'description': 'Reviewed description\n\n#ClipFactory',
            'tags': ['clip factory'],
            'categoryId': '22',
            'defaultLanguage': 'en',
        },
        'status': {
            'privacyStatus': 'private',
            'publishAt': '2026-07-12T00:30:00Z',
            'selfDeclaredMadeForKids': False,
            'containsSyntheticMedia': False,
        },
    }
```

Append these converter cases:

```python
def test_private_review_omits_publish_at_and_deduplicates_hashtags() -> None:
    request = make_create_video_request(
        visibility='PRIVATE_REVIEW',
        description='Reviewed description\n\n#clipfactory',
        hashtags=('#clipfactory', '#shorts'),
    )
    client = create_video_entity_to_client(request)
    assert client.status.publishAt is None
    assert client.snippet.description.count('#clipfactory') == 1
    assert client.snippet.description.count('#shorts') == 1


def test_unverified_schedule_is_rejected_before_client_conversion() -> None:
    with pytest.raises(UnverifiedSchedulingError):
        create_video_entity_to_client(make_create_video_request(
            visibility='SCHEDULED', api_project_verified=False,
        ))


@pytest.mark.parametrize('provider_value', ['mystery', 'newProviderValue'])
def test_unknown_provider_status_is_sanitized(provider_value: str) -> None:
    result = processing_client_to_entity(make_processing_client(upload_status=provider_value))
    assert result.failure_code == 'UNKNOWN_PROVIDER_STATUS'
```

- [ ] **RED 1.2 — Witness missing helpers/converter.**

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_resumable_range.py tests/adapters/youtube/test_youtube_video_converter.py -q
```

Expected RED: helper/converter signature shells collect; `acknowledged_bytes_from_range('bytes=0-524287', 1048576)` returns the shell value instead of `524288`.

- [ ] **GREEN 1.3 — Implement exact range and DTO conversion.**

`acknowledged_bytes_from_range` accepts only absent header or `bytes=0-N`, ensures `0 <= N < total_bytes`, and returns `N + 1`.

Define closed Pydantic Google Client DTOs for insert request, upload completion video ID, `videos.list` processing details/status, error envelope, and thumbnail response. `create_video_entity_to_client` always writes `privacyStatus='private'`; includes `publishAt` only for verified scheduled input; writes `selfDeclaredMadeForKids` and `containsSyntheticMedia`; combines reviewed hashtags into description without duplication. The application request remains unchanged/frozen.

```python
_RANGE = re.compile(r'^bytes=0-(\d+)$')


def acknowledged_bytes_from_range(value: str | None, total_bytes: int) -> int:
    if value is None:
        return 0
    match = _RANGE.fullmatch(value)
    if match is None:
        raise InvalidResumableRangeError('invalid resumable Range header')
    end = int(match.group(1))
    if end < 0 or end >= total_bytes:
        raise InvalidResumableRangeError('resumable Range exceeds upload length')
    return end + 1


def create_video_entity_to_client(request: CreateVideoRequest) -> GoogleVideoInsertClientDto:
    publish_at = request.schedule_at_utc if request.visibility == 'SCHEDULED' else None
    if publish_at is not None and not request.api_project_verified:
        raise UnverifiedSchedulingError('unverified API projects support private review only')
    return GoogleVideoInsertClientDto(
        snippet=GoogleVideoSnippetClientDto(
            title=request.metadata.title,
            description=append_unique_hashtags(request.metadata.description, request.metadata.hashtags),
            tags=list(request.metadata.keyword_tags),
            categoryId=request.metadata.category_id,
            defaultLanguage=request.metadata.default_language,
        ),
        status=GoogleVideoStatusClientDto(
            privacyStatus='private',
            publishAt=publish_at,
            selfDeclaredMadeForKids=request.metadata.made_for_kids,
            containsSyntheticMedia=request.metadata.contains_synthetic_media,
        ),
    )
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_resumable_range.py tests/adapters/youtube/test_youtube_video_converter.py -q
```

Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Make every provider enum conversion exhaustive.**

Use explicit dictionaries for `processing|succeeded|failed|terminated` and known failure/rejection reasons. `terminated` maps to failed code `PROCESSING_TERMINATED`. Unknown strings map to the safe typed failure code, never an unsafe cast. Rerun converter tests.

```python
PROCESSING_STATES: Final = {
    'processing': ProcessingState.PROCESSING,
    'succeeded': ProcessingState.SUCCEEDED,
    'failed': ProcessingState.FAILED,
    'terminated': ProcessingState.FAILED,
}
PROCESSING_FAILURE_CODES: Final = {
    'terminated': 'PROCESSING_TERMINATED',
    'codec': 'PROCESSING_CODEC_REJECTED',
    'fileFormat': 'PROCESSING_FILE_FORMAT_REJECTED',
}
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_video_converter.py -q
```

## RED-GREEN-REFACTOR cycle 2: create, probe, chunk, and completion contract

- [ ] **RED 2.1 — Write fake-server HTTP contract tests.**

Create `test_youtube_publisher.py` with a complete fake token provider and `pytest-httpserver` expectations:

```python
@pytest.mark.asyncio
async def test_create_session_is_private_and_captures_location(httpserver) -> None:
    httpserver.expect_request(
        '/upload/youtube/v3/videos',
        method='POST',
        query_string={'uploadType': 'resumable', 'part': 'snippet,status'},
        headers={
            'Authorization': 'Bearer sentinel-access',
            'X-Upload-Content-Length': '1048576',
            'X-Upload-Content-Type': 'video/mp4',
        },
        json=expected_private_video_insert_json(),
    ).respond_with_data('', status=200, headers={'Location': f'{httpserver.url_for("/session/1")}'})
    publisher = make_publisher(httpserver)
    session = await publisher.create_session('connection-1', make_create_video_request())
    assert session.reference.endswith('/session/1')


@pytest.mark.asyncio
async def test_probe_and_chunk_resume_from_range_end_plus_one(httpserver) -> None:
    httpserver.expect_oneshot_request(
        '/session/1',
        method='PUT',
        headers={'Content-Length': '0', 'Content-Range': 'bytes */1048576'},
    ).respond_with_data('', status=308, headers={'Range': 'bytes=0-524287'})
    httpserver.expect_oneshot_request(
        '/session/1',
        method='PUT',
        headers={'Content-Range': 'bytes 524288-1048575/1048576'},
        data=b'b' * 524288,
    ).respond_with_json({'id': 'video-safe-1'}, status=201)
    publisher = make_publisher(httpserver)
    progress = await publisher.query_session('connection-1', ResumableSession(httpserver.url_for('/session/1')), 1048576)
    assert progress.acknowledged_bytes == 524288
    completed = await publisher.upload_chunk(
        'connection-1',
        ResumableSession(httpserver.url_for('/session/1')),
        progress.acknowledged_bytes,
        b'b' * 524288,
        1048576,
    )
    assert completed.completed_video_id == 'video-safe-1'
```

The same file contains the following executable matrix and local-validation assertion:

```python
@pytest.mark.parametrize(
    ('status', 'error_type'),
    [
        (500, RetryableYouTubeError),
        (502, RetryableYouTubeError),
        (503, RetryableYouTubeError),
        (504, RetryableYouTubeError),
        (400, PermanentYouTubeError),
        (403, PermanentYouTubeError),
    ],
)
@pytest.mark.asyncio
async def test_upload_status_mapping(httpserver, status, error_type) -> None:
    httpserver.expect_oneshot_request('/session/1', method='PUT').respond_with_data('', status=status)
    with pytest.raises(error_type):
        await make_publisher(httpserver).upload_chunk(
            'connection-1', ResumableSession(httpserver.url_for('/session/1')),
            0, b'x' * 262144, 524288,
        )


@pytest.mark.asyncio
async def test_rejects_misaligned_nonfinal_chunk_without_http(httpserver) -> None:
    publisher = make_publisher(httpserver)
    with pytest.raises(InvalidChunkSizeError):
        await publisher.upload_chunk(
            'connection-1', ResumableSession(httpserver.url_for('/session/1')),
            0, b'x' * 262143, 524288,
        )
    assert publisher.http_request_count == 0
```

Also include named cases `test_308_without_range_returns_zero`, `test_retry_after_is_parsed`, `test_pre_final_404_is_expired`, `test_invalid_or_missing_location_is_rejected`, `test_completion_requires_video_id`, and `test_logs_omit_session_query_token_and_body`; each asserts the corresponding value/error and the last asserts all sentinels are absent from `caplog.text`.

Add this final-dispatch ambiguity test:

```python
@pytest.mark.asyncio
async def test_lost_final_result_then_404_is_uncertain_not_expired(httpserver) -> None:
    publisher = make_publisher(
        httpserver,
        transport=FinalChunkResponseLostThenNotFoundTransport(),
    )
    with pytest.raises(FinalUploadOutcomeUncertainError) as error:
        await publisher.upload_chunk(
            'connection-1',
            ResumableSession(httpserver.url_for('/session/1')),
            524288,
            b'b' * 524288,
            1048576,
        )
    assert error.value.safe_reason_code == 'SESSION_NOT_FOUND_AFTER_FINAL_DISPATCH'
    assert publisher.created_session_count == 0
```

Create `test_minio_artifact_byte_source.py` with exact half-open range behavior:

```python
@pytest.mark.asyncio
async def test_reads_only_the_requested_half_open_range(minio_fixture) -> None:
    reference = await minio_fixture.put('renders/clip-1/final.mp4', b'0123456789')
    source = MinioArtifactByteSource(minio_fixture.client, minio_fixture.bucket)
    assert await source.size(reference) == 10
    assert await source.read_range(reference, 3, 7) == b'3456'
    assert minio_fixture.last_get == {
        'object_key': 'renders/clip-1/final.mp4', 'offset': 3, 'length': 4,
    }
```

- [ ] **RED 2.2 — Witness missing publisher.**

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_publisher.py tests/adapters/storage/test_minio_artifact_byte_source.py -q
```

Expected RED: the publisher signature shell collects; the successful create-session response raises `NotImplementedError('create_session')` instead of returning the opaque `/session/1` reference.

- [ ] **GREEN 2.3 — Implement bounded HTTP methods.**

Use the Task 7 memory-token provider for every request. Create sessions with JSON body plus exact upload headers. Validate the returned `Location` is HTTPS under `www.googleapis.com` in production; fake configuration explicitly allowlists its loopback origin. Probe with empty `PUT` and `Content-Range: bytes */TOTAL`. Upload exact byte ranges, require fixed `8 * 1024 * 1024` nonfinal chunks in production (a multiple of 256 KiB), and accept the shorter final chunk. Return immutable application values; never parse provider query fields into them.

`MinioArtifactByteSource.read_range` rejects `start < 0` or `endExclusive <= start`, verifies the full Phase 1 `ObjectReference` bucket/version/hash metadata, calls the Phase 1-constructed MinIO client's `get_object(reference.bucket, reference.key, version_id=reference.version_id, offset=start, length=endExclusive-start)`, reads exactly that length in `asyncio.to_thread`, and always closes/releases the response in `finally`. It returns bytes only; it never materializes a local path.

Map responses exactly:

```python
TRANSIENT_UPLOAD_STATUS = frozenset({500, 502, 503, 504})
final_chunk_was_dispatched = start + len(chunk) == total_bytes

if response.status_code == 308:
    return UploadProgress(
        acknowledged_bytes=acknowledged_bytes_from_range(
            response.headers.get('Range'), total_bytes
        ),
        completed_video_id=None,
        retry_after_seconds=parse_retry_after(response.headers.get('Retry-After')),
    )
if response.status_code == 201:
    video = GoogleVideoInsertResponseClientDto.model_validate(response.json())
    return UploadProgress(total_bytes, video.id, None)
if response.status_code == 404 and not final_chunk_was_dispatched:
    raise ResumableSessionExpiredError('resumable upload session expired before final dispatch')
if response.status_code == 404:
    raise FinalUploadOutcomeUncertainError('SESSION_NOT_FOUND_AFTER_FINAL_DISPATCH')
if response.status_code in TRANSIENT_UPLOAD_STATUS:
    raise RetryableYouTubeError.from_response(response)
raise PermanentYouTubeError.from_response(response)
```

Run publisher/range-source tests. Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Ensure query/session reference redaction.**

Persist/return the full opaque reference because resume requires it, but every `repr`, error, heartbeat, and log renders `scheme://host/path?[REDACTED]`. Add a sentinel `upload_id` capture test before implementing the safe formatter; rerun.

```python
def test_session_reference_formatter_redacts_query(caplog) -> None:
    reference = ResumableSession('https://www.googleapis.com/upload/session?upload_id=sentinel-session')
    logger.info('resume', extra={'session': safe_session_reference(reference)})
    assert 'sentinel-session' not in caplog.text
    assert 'https://www.googleapis.com/upload/session?[REDACTED]' in caplog.text
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_publisher.py -q
```

## RED-GREEN-REFACTOR cycle 3: processing poll and warning-only thumbnail

- [ ] **RED 3.1 — Write poll/thumbnail behavior tests.**

```python
@pytest.mark.asyncio
async def test_processing_status_maps_progress_and_failure(httpserver) -> None:
    httpserver.expect_oneshot_request(
        '/youtube/v3/videos',
        query_string={'part': 'status,processingDetails', 'id': 'video-safe-1'},
    ).respond_with_json({
        'items': [{
            'id': 'video-safe-1',
            'status': {'uploadStatus': 'uploaded', 'privacyStatus': 'private'},
            'processingDetails': {
                'processingStatus': 'processing',
                'processingProgress': {'partsProcessed': '4', 'partsTotal': '10'},
            },
        }],
    })
    result = await make_publisher(httpserver).get_processing_status('connection-1', 'video-safe-1')
    assert result == ProcessingResult(ProcessingState.PROCESSING, 40, None)


@pytest.mark.asyncio
async def test_thumbnail_403_is_warning_not_exception(httpserver) -> None:
    httpserver.expect_request('/upload/youtube/v3/thumbnails/set', method='POST')\
        .respond_with_json({'error': {'code': 403, 'errors': [{'reason': 'forbidden'}]}}, status=403)
    result = await make_publisher(httpserver).set_thumbnail(
        'connection-1', 'video-safe-1', 'image/png', b'png-bytes'
    )
    assert result == ThumbnailResult(False, 'THUMBNAIL_FORBIDDEN')
```

Append this exact matrix:

```python
@pytest.mark.parametrize(
    ('scenario', 'expected'),
    [
        ('processing_succeeded', ProcessingState.SUCCEEDED),
        ('processing_failed', ProcessingState.FAILED),
        ('processing_terminated', ProcessingState.FAILED),
        ('processing_empty', 'VIDEO_STATUS_NOT_FOUND'),
        ('thumbnail_success', ThumbnailResult(True, None)),
        ('thumbnail_invalid_mime', 'THUMBNAIL_INVALID_MIME'),
        ('thumbnail_too_large', 'THUMBNAIL_TOO_LARGE'),
        ('thumbnail_429', ThumbnailResult(False, 'THUMBNAIL_RATE_LIMITED')),
        ('thumbnail_503', RetryableYouTubeError),
    ],
)
@pytest.mark.asyncio
async def test_poll_and_thumbnail_matrix(httpserver, scenario, expected) -> None:
    publisher, operation = configure_poll_or_thumbnail(httpserver, scenario)
    if isinstance(expected, type) and issubclass(expected, Exception):
        with pytest.raises(expected):
            await operation(publisher)
    else:
        assert await operation(publisher) == expected
```

Add reconciliation cases using a fake channel uploads playlist plus `videos.list`: exactly one title/description/category match with duration within 1000 ms and upload timestamp in `[finalDispatch - 5 minutes, now]` returns `VIDEO_FOUND` with ID/URL; zero returns `NO_MATCH_FOUND`; multiple/partial matches or provider failure returns `INCONCLUSIVE` with no ID. The adapter never chooses a replacement session.

- [ ] **RED 3.2 — Witness missing methods/mappings.**

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_publisher.py -q
```

Expected RED: `test_processing_status_maps_progress_and_failure` receives the adapter's temporary `UNKNOWN_PROVIDER_STATUS` result instead of `ProcessingState.PROCESSING`; imports and test collection must succeed.

- [ ] **GREEN 3.3 — Implement status and thumbnail endpoints.**

Poll `GET /youtube/v3/videos?part=status,processingDetails&id=<videoId>`. Compute progress only when both integer strings exist and total is positive; clamp 0–100. Map owner-visible failure codes to sanitized application codes.

For reconciliation, call `channels.list(part=contentDetails,mine=true)` to obtain the authorized channel's uploads playlist, `playlistItems.list(part=snippet,contentDetails,playlistId=<id>,maxResults=25)` to collect recent candidates, then `videos.list(part=snippet,contentDetails,status,id=<candidate IDs>)` for strong comparison. Use `youtube.readonly`; never broaden to `youtube.force-ssl`. Return a match only when exactly one candidate satisfies every requested field/time/duration condition.

Thumbnail accepts only `image/jpeg`/`image/png` and at most 2,000,000 bytes, calls `POST /upload/youtube/v3/thumbnails/set?videoId=<id>`, and converts 400/403/404/429 permanent responses to warning codes. Retryable 5xx remains a typed retryable error so Task 12 may retry best effort within its bound; terminal failure still becomes a warning.

```python
async def set_thumbnail(
    self, connection_id: str, video_id: str, content_type: str, content: bytes,
) -> ThumbnailResult:
    if content_type not in {'image/jpeg', 'image/png'}:
        return ThumbnailResult(False, 'THUMBNAIL_INVALID_MIME')
    if len(content) > 2_000_000:
        return ThumbnailResult(False, 'THUMBNAIL_TOO_LARGE')
    response = await self._authorized_request(
        connection_id, 'POST', '/upload/youtube/v3/thumbnails/set',
        params={'videoId': video_id}, headers={'Content-Type': content_type}, content=content,
    )
    if response.status_code in {500, 502, 503, 504}:
        raise RetryableYouTubeError.from_response(response)
    if response.status_code in {400, 403, 404, 429}:
        return ThumbnailResult(False, thumbnail_warning_code(response))
    response.raise_for_status()
    return ThumbnailResult(True, None)
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_publisher.py -q
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Do not claim Shorts placement.**

The port result is `applied` plus warning only. It has no `shortsThumbnailVisible` field. Add a static contract assertion for the dataclass field set and rerun tests.

```python
def test_thumbnail_result_has_no_shorts_visibility_claim() -> None:
    assert {field.name for field in dataclasses.fields(ThumbnailResult)} == {
        'applied', 'warning_code',
    }
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_publisher.py -q
```

## RED-GREEN-REFACTOR cycle 4: end-to-end fake YouTube contract

- [ ] **RED 4.1 — Build a stateful fake server test.**

`test_fake_youtube_resumable_upload.py` runs create -> first nonfinal chunk `308` -> simulated network failure -> probe -> remaining chunk `201` -> processing -> succeeded -> thumbnail warning. It records every request and asserts:

```python
assert fake_youtube.created_video_count == 1
assert fake_youtube.video('video-safe-1').privacy_status == 'private'
assert fake_youtube.video('video-safe-1').publish_at == '2026-07-12T00:30:00Z'
assert fake_youtube.received_ranges == [
    'bytes 0-8388607/12582912',
    'bytes 8388608-12582911/12582912',
]
assert result.thumbnail_warning_code == 'THUMBNAIL_FORBIDDEN'
```

Also run an unverified private case with no `publishAt` and a permanent upload failure that leaves the other fake video untouched.

Run a separate final-chunk uncertainty case: fake YouTube accepts the final bytes/creates `video-uncertain-1`, drops the response, and returns `404` on the next session probe. Assert `FinalUploadOutcomeUncertainError`, no adapter-created replacement session, no second upload request, and no claim that the remote video ID is known locally.

- [ ] **RED 4.2 — Witness missing stateful integration behavior.**

```bash
uv run --directory apps/worker pytest ../../tests/integration/youtube-publishing/test_fake_youtube_resumable_upload.py -q
```

Expected RED: composition shells run; after the simulated network loss the fake records a second created remote video instead of exactly one resumed video.

- [ ] **GREEN 4.3 — Complete composition and integration fixture.**

Wire `HttpxYouTubePublisher` only in the worker composition root with provider/token/object-store dependencies. The fake server base URL is injectable only from worker test/local configuration. No browser/web environment receives it.

```python
youtube_publisher = HttpxYouTubePublisher(
    http=provider_http_client(settings.youtube_api_base_url),
    token_provider=google_oauth_gateway,
    allowed_session_origins=settings.youtube_resumable_session_origins,
    logger=redacted_provider_logger,
)
activity_container.register(YouTubePublisher, youtube_publisher)
```

```bash
uv run --directory apps/worker pytest ../../tests/integration/youtube-publishing/test_fake_youtube_resumable_upload.py -q
```

Expected GREEN: PASS.

- [ ] **REFACTOR 4.4 — Run port contract against fake and production adapter.**

Create one parameterized contract suite whose subject factory returns the HTTP adapter against the stateful fake and the in-memory deterministic fake used by application tests. Assert identical create/probe/chunk/completion/pre-final-expiry/final-uncertainty/error/warning semantics; do not assert fake implementation details in the shared suite.

```bash
uv run --directory apps/worker pytest tests/contracts/test_youtube_publisher_contract.py -q
```

## Broader verification

- [ ] Run:

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_resumable_range.py tests/adapters/youtube/test_youtube_video_converter.py tests/adapters/youtube/test_youtube_publisher.py -q
uv run --directory apps/worker pytest ../../tests/integration/youtube-publishing/test_fake_youtube_resumable_upload.py -q
uv run --directory apps/worker ruff check src tests
uv run --directory apps/worker mypy src
uv run --directory apps/worker lint-imports
pnpm test:architecture
pnpm test:integration
git diff --check
```

- [ ] Confirm every insert request is private, and only a verified scheduled request has `publishAt`.

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_publisher.py -q -k 'private or publish_at or unverified'
```

- [ ] Confirm session/token/query/body values are absent from logs/errors and SDK/client DTOs are adapter-only.

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_youtube_publisher.py -q -k 'redact or credential or session'
pnpm test:architecture
```

- [ ] Confirm thumbnail failure never raises an upload-failure result.

```bash
uv run --directory apps/worker pytest tests/contracts/test_youtube_publisher_contract.py -q -k thumbnail
```

## Review gate

Approve only when the fake server proves exact resumable semantics, offsets never overlap/skip, one private video is created, status polling is sanitized, unverified scheduling is impossible, and thumbnail failure remains warning-only.

## Suggested commit

```text
feat(worker): add resumable YouTube publisher adapter
```
