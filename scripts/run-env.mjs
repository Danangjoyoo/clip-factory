import { spawn } from 'node:child_process';
import { readFileSync as read } from 'node:fs';

const [name, command, ...args] = process.argv.slice(2);
if (!['dev', 'local'].includes(name) || !command) {
  throw new Error('Usage: node scripts/run-env.mjs <dev|local> <command> [...args]');
}

const env = { ...process.env };
for (const line of read(`env/.${name}.env`, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
  if (match) env[match[1]] = match[2];
}
const child = spawn(command, args, { env, stdio: 'inherit', shell: false });
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
