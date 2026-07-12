import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const requireFromWeb = createRequire(
  new URL('../../../apps/web/package.json', import.meta.url),
);
type PgClient = {
  query: (sql: string) => Promise<{ rows: unknown[]; rowCount: number | null }>;
  connect: () => Promise<void>;
  end: () => Promise<void>;
  connected?: boolean;
};
export const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://clip_factory:clip_factory_local_dev@127.0.0.1:5432/clip_factory';
let client: PgClient | undefined;
export const postgres = {
  query: async (sql: string) => {
    const { Client } = requireFromWeb('pg') as {
      Client: new (config: { connectionString: string }) => PgClient;
    };
    client ??= new Client({ connectionString: databaseUrl });
    if (!client.connected) {
      await client.connect();
      client.connected = true;
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
    .update(
      stdout
        .replace(/-- Dumped.*\n/g, '')
        .replace(/^\\(?:un)?restrict .*\n/gm, ''),
    )
    .digest('hex');
}
