import { readdir, readFile, stat } from 'node:fs/promises';
import process from 'node:process';
const secret = /(OPENAI_API_KEY|sk-[A-Za-z0-9_-]+)/u;
const absolute = /(?:^|[\s"'])\/(?:Users|home|private|tmp)\//u;
export async function audit(path) {
  const files = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(full);
      else files.push(full);
    }
  };
  await walk(path);
  const findings = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8').catch(() => '');
    if (secret.test(text)) findings.push({ rule: 'secrets', file });
    if (absolute.test(text)) findings.push({ rule: 'absolute-path', file });
  }
  return {
    status: findings.length ? 'FAIL' : 'PASS',
    counts: { files: files.length, findings: findings.length },
    findings: findings.map(({ rule }) => rule),
  };
}
if (import.meta.url === `file://${process.argv[1]}`)
  audit(process.argv[2] ?? '.artifacts/acceptance/latest').then((result) => {
    console.log(JSON.stringify(result));
    if (result.status === 'FAIL') process.exitCode = 1;
  });
