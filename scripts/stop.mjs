import { spawnSync } from 'node:child_process';
const result = spawnSync(
  'docker',
  [
    'compose',
    '--env-file',
    '.env',
    '-f',
    'infra/compose/docker-compose.yml',
    'down',
  ],
  { stdio: 'inherit', shell: false },
);
process.exitCode = result.status ?? 1;
