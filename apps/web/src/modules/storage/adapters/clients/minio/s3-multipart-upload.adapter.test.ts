import { afterEach, expect, it, vi } from 'vitest';
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
