export const bucket = process.env.MINIO_BUCKET ?? 'clip-factory-test';
export const minio = { send: async (...args: unknown[]) => { const { S3Client } = await import('@aws-sdk/client-s3'); const client = new S3Client({ endpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000', forcePathStyle: true, region: 'us-east-1', credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'clip_factory_local', secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'clip_factory_local_secret' } }); return client.send(args[0] as never); } };
export async function ensureBucket() { const { HeadBucketCommand, CreateBucketCommand } = await import('@aws-sdk/client-s3'); try { await minio.send(new HeadBucketCommand({ Bucket: bucket })); } catch { await minio.send(new CreateBucketCommand({ Bucket: bucket })); } }
export const PutObjectCommand = class { constructor(public input: unknown) {} };
export const HeadObjectCommand = class { constructor(public input: unknown) {} };
export const DeleteObjectCommand = class { constructor(public input: unknown) {} };
