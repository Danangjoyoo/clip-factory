import { mkdir, readFile, symlink, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import process from 'node:process';

const root = new URL('../../', import.meta.url);
const outputRoot = new URL('../../.artifacts/acceptance/', import.meta.url);
const ids = Array.from({ length: 14 }, (_, index) => index + 1);
const now = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const dir = new URL(`${now}/`, outputRoot);
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function shellEvidence({ runId = now, dryRun = true } = {}) {
  return {
    schemaVersion: 1,
    runId,
    mode: dryRun ? 'DRY_RUN' : 'LIVE',
    generatedAt: new Date().toISOString(),
    criteria: ids.map((id) => ({
      id,
      status: 'NOT_RUN',
      evidence: [],
      commands: [`criterion-${id}`],
    })),
    privacy: { status: 'NOT_RUN', rules: [] },
    artifacts: [],
    artifactHashes: {},
  };
}
export async function run({ dryRun = true } = {}) {
  await mkdir(dir, { recursive: true });
  const evidence = shellEvidence({ dryRun });
  const body = JSON.stringify(evidence, null, 2) + '\n';
  await writeFile(new URL('evidence.json', dir), body, 'utf8');
  await rm(new URL('latest', outputRoot), { force: true });
  await symlink(dir.pathname, new URL('latest', outputRoot), 'junction').catch(
    () => {},
  );
  return { directory: dir.pathname, hash: hash(body), evidence };
}
if (import.meta.url === `file://${process.argv[1]}`)
  run({ dryRun: !process.argv.includes('--live') })
    .then((result) =>
      console.log(
        JSON.stringify({
          directory: result.directory,
          mode: result.evidence.mode,
        }),
      ),
    )
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
