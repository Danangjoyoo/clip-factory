import { spawnSync } from 'node:child_process';

export function check(pathOverride) {
  const inspectedPath = `${process.cwd()}/.tools/bin:${pathOverride ?? process.env.PATH ?? ''}`;
  const checks = [
    ['Docker 29.4.0', 'docker', ['--version'], /Docker version 29\.4\.0/],
    [
      'Compose 5.1.2',
      'docker',
      ['compose', 'version'],
      /Docker Compose version v?5\.1\.2/,
    ],
    ['uv 0.11.28', 'uv', ['--version'], /uv 0\.11\.28/],
    ['ffmpeg 8.1.2', 'ffmpeg', ['-version'], /ffmpeg version 8\.1\.2/],
    ['ffprobe 8.1.2', 'ffprobe', ['-version'], /ffprobe version 8\.1\.2/],
  ];
  const missing = [];
  for (const [label, command, commandArgs, expected] of checks) {
    const result = spawnSync(command, commandArgs, {
      env: { ...process.env, PATH: inspectedPath },
      encoding: 'utf8',
    });
    if (
      result.status !== 0 ||
      !expected.test(`${result.stdout}${result.stderr}`)
    )
      missing.push(label);
  }
  const python = spawnSync(
    'uv',
    ['run', '--directory', 'apps/worker', 'python', '--version'],
    { env: { ...process.env, PATH: inspectedPath }, encoding: 'utf8' },
  );
  if (
    python.status !== 0 ||
    !/Python 3\.12\.11/.test(`${python.stdout}${python.stderr}`)
  )
    missing.push('Python 3.12.11');
  if (missing.length) {
    throw new Error(
      `Missing or mismatched native dependencies: ${missing.join(', ')}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const pathArg = args.indexOf('--path');
  try {
    check(pathArg >= 0 ? args[pathArg + 1] : undefined);
  } catch (error) {
    const command =
      process.platform === 'darwin'
        ? 'brew bundle && ./scripts/bootstrap-native.sh --platform darwin-arm64'
        : './scripts/bootstrap-native.sh --platform linux-x86_64';
    console.error(`${error.message}\nRun: ${command}`);
    process.exitCode = 1;
  }
}
