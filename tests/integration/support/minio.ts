import { createRequire } from 'node:module';

const requireFromWeb = createRequire(
  new URL('../../../apps/web/package.json', import.meta.url),
);
type S3Command = { input: unknown };

function s3() {
  return requireFromWeb('@aws-sdk/client-s3') as {
    S3Client: new (config: unknown) => {
      send: (command: S3Command) => unknown;
    };
    HeadBucketCommand: new (input: unknown) => S3Command;
    CreateBucketCommand: new (input: unknown) => S3Command;
    PutObjectCommand: new (input: unknown) => S3Command;
    HeadObjectCommand: new (input: unknown) => S3Command;
    DeleteObjectCommand: new (input: unknown) => S3Command;
  };
}

export const bucket = process.env.MINIO_BUCKET ?? 'clip-factory-test';
export const minio = {
  send: async (...args: unknown[]) => {
    const { S3Client } = s3();
    const client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000',
      forcePathStyle: true,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'clip_factory_local',
        secretAccessKey:
          process.env.MINIO_SECRET_KEY ?? 'clip_factory_local_secret',
      },
    });
    return client.send(args[0] as S3Command);
  },
};
export async function ensureBucket() {
  const { HeadBucketCommand, CreateBucketCommand } = s3();
  try {
    await minio.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await minio.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}
export const { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } =
  s3();
