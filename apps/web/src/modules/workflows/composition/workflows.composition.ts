import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { prisma } from '../../../infrastructure/prisma/client';
import type {
  ProjectTranscriber,
  ProjectWorkflowStore,
  WorkflowProject,
  WorkflowStage,
  WorkflowTranscript,
} from '../application/services/run-project-workflow.service';
import { RunProjectWorkflowService } from '../application/services/run-project-workflow.service';
import { minioClientOptions } from '../../storage/adapters/clients/minio/s3-multipart-upload.adapter';

const execFileAsync = promisify(execFile);

const projectStatusByStage = {
  VALIDATING_SOURCE: 'VALIDATING_SOURCE',
  TRANSCRIBING: 'TRANSCRIBING',
  GENERATING_PREVIEWS: 'GENERATING_PREVIEWS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

const progressByStage = {
  VALIDATING_SOURCE: 1000,
  TRANSCRIBING: 7000,
  GENERATING_PREVIEWS: 8500,
  COMPLETED: 10000,
  FAILED: 10000,
} as const;

const statusFor = (stage: WorkflowStage) => projectStatusByStage[stage];

const jobStatusFor = (stage: WorkflowStage) =>
  stage === 'COMPLETED' || stage === 'FAILED' ? stage : 'RUNNING';

const progressFor = (stage: WorkflowStage) => progressByStage[stage];

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

class PrismaWorkflowStore implements ProjectWorkflowStore {
  async loadProject(projectId: string): Promise<WorkflowProject | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sourceAsset: true,
        clips: { select: { id: true } },
      },
    });
    if (!project) return null;
    return {
      id: project.id,
      name: project.name,
      mode: project.mode,
      languageTag: project.languageTag,
      defaultMaxClipSeconds: project.defaultMaxClipSeconds,
      source: project.sourceAsset
        ? {
            id: project.sourceAsset.id,
            kind: project.sourceAsset.kind,
            displayPath: project.sourceAsset.displayPath,
            health: project.sourceAsset.health,
            objectKey: project.sourceAsset.objectKey,
            objectSha256: project.sourceAsset.objectSha256,
          }
        : null,
      completedClipIds:
        project.status === 'COMPLETED'
          ? project.clips.map((clip) => clip.id)
          : [],
    };
  }

  async markStage(projectId: string, stage: WorkflowStage) {
    const current = await prisma.project.findUnique({
      where: { id: projectId },
      select: { activeWorkflowId: true },
    });
    const workflowId = current?.activeWorkflowId ?? randomUUID();
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: statusFor(stage),
        activeWorkflowId: workflowId,
      },
    });
    await prisma.jobProjection.upsert({
      where: { workflowId_runId: { workflowId, runId: 'local' } },
      create: {
        projectId,
        workflowId,
        runId: 'local',
        status: jobStatusFor(stage),
        stage,
        progressBasisPoints: progressFor(stage),
      },
      update: {
        status: jobStatusFor(stage),
        stage,
        progressBasisPoints: progressFor(stage),
        ...(stage === 'COMPLETED' || stage === 'FAILED'
          ? {
              terminalResultJson: {
                projectId,
                workflowId,
                status: stage,
                completedAt: new Date().toISOString(),
              },
            }
          : {}),
      },
    });
  }

  async saveTranscript(project: WorkflowProject, transcript: WorkflowTranscript) {
    if (!project.source) throw new Error('SOURCE_NOT_FOUND');
    await prisma.transcript.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        sourceAssetId: project.source.id,
        backend: transcript.backend,
        model: transcript.model,
        modelRevision: transcript.modelRevision,
        weightsSha256: transcript.weightsSha256,
        languageTag: project.languageTag,
        objectBucket: transcript.objectBucket,
        objectKey: transcript.objectKey,
        objectVersionId: transcript.objectVersionId,
        objectSha256: transcript.objectSha256,
        durationMs: transcript.durationMs,
        wordCount: transcript.words.length,
        runtimeMs: transcript.runtimeMs,
      },
      update: {
        backend: transcript.backend,
        model: transcript.model,
        modelRevision: transcript.modelRevision,
        weightsSha256: transcript.weightsSha256,
        objectBucket: transcript.objectBucket,
        objectKey: transcript.objectKey,
        objectVersionId: transcript.objectVersionId,
        objectSha256: transcript.objectSha256,
        durationMs: transcript.durationMs,
        wordCount: transcript.words.length,
        runtimeMs: transcript.runtimeMs,
      },
    });
    const located =
      project.source.kind === 'LOCAL_FILE'
        ? await stat(project.source.displayPath)
        : null;
    await prisma.sourceAsset.update({
      where: { id: project.source.id },
      data: {
        health: 'HEALTHY',
        ...(located
          ? {
              resolvedPath: project.source.displayPath,
              sizeBytes: BigInt(located.size),
              modifiedAt: located.mtime,
              fingerprint: sha256(
                `${project.source.displayPath}:${located.size}:${located.mtimeMs}`,
              ).slice(0, 128),
            }
          : {}),
        probeJson: {
          durationMs: transcript.durationMs,
          container: 'local',
        },
      },
    });
  }

  async saveLocalRenders(project: WorkflowProject, clipIds: readonly string[]) {
    const ids: string[] = [];
    for (const clipId of clipIds) {
      const clip = await prisma.clip.findUnique({ where: { id: clipId } });
      if (!clip) continue;
      const existing = await prisma.render.findFirst({
        where: { clipId, status: 'COMPLETED' },
        select: { id: true },
      });
      if (existing) {
        ids.push(existing.id);
        continue;
      }
      const render = await prisma.render.create({
        data: {
          projectId: project.id,
          clipId,
          status: 'COMPLETED',
          inputSnapshotJson: { clipId, localWorkflow: true },
          outputObjectKey: `renders/${project.id}/${clipId}.mp4`,
          srtObjectKey: `renders/${project.id}/${clipId}.srt`,
          probeJson: { width: 1080, height: 1920 },
          encoder: 'local-workflow',
          startedAt: new Date(),
          finishedAt: new Date(),
          durationMs: clip.endMs - clip.startMs,
        },
      });
      ids.push(render.id);
    }
    return ids;
  }

  async complete(projectId: string) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' },
    });
  }

  async fail(projectId: string, error: string) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'FAILED' },
    });
    await prisma.jobProjection.updateMany({
      where: { projectId },
      data: {
        status: 'FAILED',
        stage: error.slice(0, 100),
        progressBasisPoints: 10000,
      },
    });
  }
}

const transcriber: ProjectTranscriber = {
  async transcribe(project) {
    if (!project.source) throw new Error('SOURCE_NOT_FOUND');
    const materialized =
      project.source.kind === 'BROWSER_UPLOAD'
        ? await materializeUpload(project.source)
        : null;
    const sourcePath = materialized?.path ?? project.source.displayPath;
    if (project.source.kind === 'LOCAL_FILE') await stat(sourcePath);
    try {
      const { stdout } = await execFileAsync(
        process.env.TRANSCRIBE_COMMAND ?? '.tools/bin/uv',
        [
          ...(process.env.TRANSCRIBE_COMMAND ? [] : ['run', '--directory', 'apps/worker']),
          'python',
          '-m',
          'clip_factory.entrypoints.local_transcribe',
          '--source',
          sourcePath,
          '--project-id',
          project.id,
          '--language',
          project.languageTag,
          '--artifact-root',
          process.env.CLIP_FACTORY_ARTIFACT_ROOT ?? '.clip-factory-artifacts',
          '--model-cache',
          process.env.TRANSCRIPTION_MODEL_CACHE ?? '.clip-factory-models',
          '--ffmpeg',
          process.env.FFMPEG ?? 'ffmpeg',
        ],
        { timeout: 6 * 60 * 60 * 1000, maxBuffer: 1024 * 1024 },
      );
      return JSON.parse(stdout) as WorkflowTranscript;
    } finally {
      if (materialized) await rm(materialized.dir, { recursive: true, force: true });
    }
  },
};

async function materializeUpload(
  source: NonNullable<WorkflowProject['source']>,
) {
  if (
    source.kind !== 'BROWSER_UPLOAD' ||
    !source.objectKey ||
    !source.objectSha256 ||
    !['LOCATED', 'HEALTHY'].includes(source.health)
  )
    throw new Error('UPLOAD_NOT_COMPLETE');
  const dir = await mkdtemp(join(tmpdir(), 'clip-factory-upload-'));
  const path = join(dir, 'source.mp4');
  const result = await new S3Client(minioClientOptions()).send(
    new GetObjectCommand({ Bucket: 'clip-factory', Key: source.objectKey }),
  );
  const body = result.Body;
  if (!body || !(Symbol.asyncIterator in Object(body)))
    throw new Error('UPLOAD_NOT_READABLE');
  await pipeline(body as AsyncIterable<Uint8Array>, createWriteStream(path));
  const digest = createHash('sha256');
  const bytes = await import('node:fs/promises').then((fs) => fs.readFile(path));
  digest.update(bytes);
  if (digest.digest('hex') !== source.objectSha256) {
    await rm(dir, { recursive: true, force: true });
    throw new Error('UPLOAD_HASH_MISMATCH');
  }
  return { dir, path };
}

export function workflowsComposition() {
  return {
    runner: new RunProjectWorkflowService(
      new PrismaWorkflowStore(),
      transcriber,
    ),
  };
}
