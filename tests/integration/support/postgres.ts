import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://clip_factory:clip_factory_local_dev@127.0.0.1:5432/clip_factory';
let client:
  | {
      query: (
        sql: string,
      ) => Promise<{ rows: unknown[]; rowCount: number | null }>;
      end: () => Promise<void>;
    }
  | undefined;
export const postgres = {
  query: async (sql: string) => {
    const { Client } = await import('pg');
    client ??= new Client({ connectionString: databaseUrl });
    if (!(client as unknown as { connected?: boolean }).connected) {
      await (client as unknown as { connect: () => Promise<void> }).connect();
      (client as unknown as { connected: boolean }).connected = true;
    }
    return client.query(sql);
  },
  end: async () => client?.end(),
};
export async function applyMigrations(url = databaseUrl) {
  await exec('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
  });
}
export async function normalizedSchemaHash(url = databaseUrl) {
  const { stdout } = await exec('pg_dump', [
    '--schema-only',
    '--no-owner',
    '--no-privileges',
    url,
  ]);
  return createHash('sha256')
    .update(stdout.replace(/-- Dumped.*\n/g, ''))
    .digest('hex');
}
