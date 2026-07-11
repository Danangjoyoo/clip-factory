import { copyFileSync, existsSync } from 'node:fs';

const name = process.argv[2];
if (!['dev', 'local'].includes(name)) {
  throw new Error('Usage: node scripts/select-env.mjs <dev|local>');
}

const source = `env/.${name}.env`;
if (!existsSync(source)) throw new Error(`Missing ${source}`);
copyFileSync(source, '.env');
console.log(`Using ${source}`);
