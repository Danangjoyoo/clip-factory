import { describe, expect, it } from 'vitest';
import { DeleteObjectCommand, HeadObjectCommand, minio, bucket, PutObjectCommand, ensureBucket } from '../support/minio';
import { integrationEnabled, uniqueId } from '../support/test-environment';
describe.skipIf(!integrationEnabled)('object lifecycle', () => { it('puts, heads and deletes an object', async () => { await ensureBucket(); const key = uniqueId('object'); await minio.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'ok' })); expect((await minio.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength).toBe(2); await minio.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); }); });
