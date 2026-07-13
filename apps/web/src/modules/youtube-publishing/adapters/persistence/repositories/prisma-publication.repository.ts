import { Prisma, PrismaClient } from '../../../../../generated/prisma/client';
import type { ProjectId, PublicationId } from '../../../../../shared/domain';
import type {
  AttachRemoteVideoEntityDto,
  InsertPublicationEntityDto,
  PublicationRepositoryPort,
  UpdatePublicationStateEntityDto,
} from '../../../application/ports/publication.repository';
import {
  publicationEntityToRecord,
  publicationRecordToEntity,
} from '../../../converters/entity-record/publication.converter';
import type { PublicationRecordDto } from '../dto/record/publication-record.dto';

type Row = Awaited<ReturnType<PrismaClient['publication']['findFirst']>>;

const select = {
  id: true,
  projectId: true,
  clipId: true,
  renderId: true,
  connectionId: true,
  metadataDraftId: true,
  workflowId: true,
  intentKey: true,
  idempotencyKey: true,
  metadataSnapshot: true,
  visibility: true,
  apiProjectVerifiedSnapshot: true,
  sourceLocalDatetime: true,
  sourceTimezone: true,
  scheduleAtUtc: true,
  state: true,
  youtubeVideoId: true,
  youtubeUrl: true,
  remoteVideoCreatedAt: true,
  thumbnailWarningCode: true,
  sanitizedErrorCode: true,
  sanitizedErrorMessage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PublicationSelect;

const record = (row: NonNullable<Row>): PublicationRecordDto => ({
  id: row.id,
  project_id: row.projectId,
  clip_id: row.clipId,
  render_id: row.renderId,
  connection_id: row.connectionId,
  metadata_draft_id: row.metadataDraftId,
  workflow_id: row.workflowId,
  intent_key: row.intentKey,
  idempotency_key: row.idempotencyKey,
  metadata_snapshot: row.metadataSnapshot,
  visibility: row.visibility as PublicationRecordDto['visibility'],
  api_project_verified_snapshot: row.apiProjectVerifiedSnapshot,
  source_local_datetime: row.sourceLocalDatetime,
  source_timezone: row.sourceTimezone,
  schedule_at_utc: row.scheduleAtUtc,
  state: row.state as PublicationRecordDto['state'],
  youtube_video_id: row.youtubeVideoId,
  youtube_url: row.youtubeUrl,
  remote_video_created_at: row.remoteVideoCreatedAt,
  thumbnail_warning_code: row.thumbnailWarningCode,
  sanitized_error_code: row.sanitizedErrorCode,
  sanitized_error_message: row.sanitizedErrorMessage,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
});

export class PrismaPublicationRepository implements PublicationRepositoryPort {
  constructor(private readonly database: PrismaClient) {}

  async findById(id: PublicationId) {
    const row = await this.database.publication.findUnique({
      where: { id },
      select,
    });
    return row ? publicationRecordToEntity(record(row)) : null;
  }

  async requireByIdForUpdate(id: PublicationId) {
    const rows = await this.database.$queryRaw<PublicationRecordDto[]>`
      select id, project_id, clip_id, render_id, connection_id, metadata_draft_id,
             workflow_id, intent_key, idempotency_key, metadata_snapshot,
             visibility, api_project_verified_snapshot, source_local_datetime,
             source_timezone, schedule_at_utc, state, youtube_video_id, youtube_url,
             remote_video_created_at, thumbnail_warning_code, sanitized_error_code,
             sanitized_error_message, created_at, updated_at
      from publications
      where id = ${id}
      for update
    `;
    if (!rows[0]) throw new Error(`publication not found: ${id}`);
    return publicationRecordToEntity(rows[0]);
  }

  async findByIdempotencyKey(key: string) {
    const row = await this.database.publication.findUnique({
      where: { idempotencyKey: key },
      select,
    });
    return row ? publicationRecordToEntity(record(row)) : null;
  }

  async listByProject(projectId: ProjectId) {
    const rows = await this.database.publication.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select,
    });
    return rows.map((row) => publicationRecordToEntity(record(row)));
  }

  async insert(input: InsertPublicationEntityDto) {
    const value = publicationEntityToRecord(input);
    const row = await this.database.publication.create({
      data: {
        id: value.id,
        projectId: value.project_id,
        clipId: value.clip_id,
        renderId: value.render_id,
        connectionId: value.connection_id,
        metadataDraftId: value.metadata_draft_id,
        workflowId: value.workflow_id,
        intentKey: value.intent_key,
        idempotencyKey: value.idempotency_key,
        metadataSnapshot: value.metadata_snapshot as Prisma.InputJsonValue,
        visibility: value.visibility,
        apiProjectVerifiedSnapshot: value.api_project_verified_snapshot,
        sourceLocalDatetime: value.source_local_datetime,
        sourceTimezone: value.source_timezone,
        scheduleAtUtc: value.schedule_at_utc,
        state: value.state,
        youtubeVideoId: value.youtube_video_id,
        youtubeUrl: value.youtube_url,
        remoteVideoCreatedAt: value.remote_video_created_at,
        thumbnailWarningCode: value.thumbnail_warning_code,
        sanitizedErrorCode: value.sanitized_error_code,
        sanitizedErrorMessage: value.sanitized_error_message,
      },
      select,
    });
    return publicationRecordToEntity(record(row));
  }

  async updateState(input: UpdatePublicationStateEntityDto) {
    const result = await this.database.publication.updateMany({
      where: { id: input.publicationId, state: input.expectedState },
      data: {
        state: input.nextState,
        thumbnailWarningCode: input.thumbnailWarningCode,
        sanitizedErrorCode: input.sanitizedErrorCode,
        sanitizedErrorMessage: input.sanitizedErrorMessage,
        updatedAt: input.updatedAt,
      },
    });
    return result.count === 1 ? this.findById(input.publicationId) : null;
  }

  async attachRemoteVideo(input: AttachRemoteVideoEntityDto) {
    const result = await this.database.publication.updateMany({
      where: { id: input.publicationId, youtubeVideoId: null },
      data: {
        youtubeVideoId: input.youtubeVideoId,
        youtubeUrl: input.youtubeUrl,
        remoteVideoCreatedAt: input.remoteVideoCreatedAt,
        updatedAt: input.remoteVideoCreatedAt,
      },
    });
    return result.count === 1 ? this.findById(input.publicationId) : null;
  }
}
