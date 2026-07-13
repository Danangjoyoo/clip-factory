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
  const dump = pgDumpCommand(url);
  const { stdout } = await exec(dump.command, dump.args);
  return createHash('sha256')
    .update(
      stdout
        .replace(/-- Dumped.*\n/g, '')
        .replace(/^\\(?:un)?restrict .*\n/gm, ''),
    )
    .digest('hex');
}

function pgDumpCommand(url: string) {
  const baseArgs = ['--schema-only', '--no-owner', '--no-privileges'];
  if (!process.env.PG_DUMP_CONTAINER)
    return { command: 'pg_dump', args: [...baseArgs, url] };

  const containerUrl = new URL(url);
  containerUrl.hostname = '127.0.0.1';
  containerUrl.port = '5432';
  return {
    command: 'docker',
    args: [
      'exec',
      process.env.PG_DUMP_CONTAINER,
      'pg_dump',
      ...baseArgs,
      containerUrl.toString(),
    ],
  };
}
