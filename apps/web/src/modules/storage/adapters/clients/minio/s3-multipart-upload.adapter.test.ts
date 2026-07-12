import { afterEach, expect, it, vi } from 'vitest';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import {
  CompleteMultipartUploadCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://upload.test'),
}));
import {
  minioClientOptions,
  minioPublicClientOptions,
  S3MultipartUploadAdapter,
} from './s3-multipart-upload.adapter';

afterEach(() => vi.unstubAllEnvs());

it('uses configured MinIO application credentials', () => {
  vi.stubEnv('MINIO_ACCESS_KEY', 'configured-key');
  vi.stubEnv('MINIO_SECRET_KEY', 'configured-secret');

  expect(minioClientOptions().credentials).toEqual({
    accessKeyId: 'configured-key',
    secretAccessKey: 'configured-secret',
  });
});

it('uses browser-reachable endpoint for signed URLs', () => {
  vi.stubEnv('MINIO_ENDPOINT', 'http://minio:9000');
  vi.stubEnv('MINIO_PUBLIC_ENDPOINT', 'http://127.0.0.1:9000');

  expect(minioClientOptions().endpoint).toBe('http://minio:9000');
  expect(minioPublicClientOptions().endpoint).toBe('http://127.0.0.1:9000');
});

it('rejects unscoped object keys and unsafe upload ids', async () => {
  const adapter = new S3MultipartUploadAdapter({
    send: async () => ({}),
  } as never);
  await expect(adapter.listParts('../escape', 'upload')).rejects.toThrow(
    'INVALID_OBJECT_KEY',
  );
  await expect(
    adapter.listParts('projects/p/sources/x.mp4', '../upload'),
  ).rejects.toThrow('INVALID_UPLOAD_ID');
});

it('creates and signs multipart uploads with SHA-256 checksums', async () => {
  const sent: unknown[] = [];
  const internal = {
    send: async (command: unknown) => {
      sent.push(command);
      return { UploadId: 'upload-1' };
    },
  };
  const adapter = new S3MultipartUploadAdapter(internal as never, {} as never);
  const key = 'projects/project-1/sources/source.mp4';

  await adapter.create(key, 'video/mp4');
  await adapter.presignPart(key, 'upload-1', 1, 'a'.repeat(43) + '=');

  expect((sent[0] as { input: unknown }).input).toMatchObject({
    ChecksumAlgorithm: 'SHA256',
  });
  const command = vi.mocked(getSignedUrl).mock.calls[0]?.[1] as {
    input: unknown;
  };
  expect(command.input).toMatchObject({
    ChecksumSHA256: 'a'.repeat(43) + '=',
  });
});

it('completes multipart uploads with each part SHA-256 checksum', async () => {
  const sent: unknown[] = [];
  const adapter = new S3MultipartUploadAdapter({
    send: async (command: unknown) => {
      sent.push(command);
      return {};
    },
  } as never);

  await adapter.complete('projects/project-1/sources/source.mp4', 'upload-1', [
    {
      partNumber: 1,
      etag: 'etag-1',
      sizeBytes: 5n,
      checksumSha256: 'a'.repeat(43) + '=',
    } as never,
  ]);

  expect(sent[0]).toBeInstanceOf(CompleteMultipartUploadCommand);
  expect((sent[0] as { input: unknown }).input).toMatchObject({
    MultipartUpload: {
      Parts: [
        {
          PartNumber: 1,
          ETag: 'etag-1',
          ChecksumSHA256: 'a'.repeat(43) + '=',
        },
      ],
    },
  });
});

it('hashes completed object bytes server-side', async () => {
  const chunks = [
    new TextEncoder().encode('vid'),
    new TextEncoder().encode('eo'),
  ] as const;
  const adapter = new S3MultipartUploadAdapter({
    send: async () => ({
      Body: (async function* () {
        yield* chunks;
      })(),
    }),
  } as never);

  await expect(
    adapter.sha256('projects/project-1/sources/source.mp4'),
  ).resolves.toBe(
    createHash('sha256').update(chunks[0]).update(chunks[1]).digest('hex'),
  );
});

it('signs browser download URLs as GET object requests', async () => {
  const adapter = new S3MultipartUploadAdapter({
    send: async () => ({}),
  } as never);
  await adapter.presign('projects/project-1/sources/source.mp4');

  const command = vi.mocked(getSignedUrl).mock.calls.at(-1)?.[1];
  expect(command).toBeInstanceOf(GetObjectCommand);
});
