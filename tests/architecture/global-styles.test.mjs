import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const tokenPath = 'apps/web/src/styles/tokens.css';
const globalPath = 'apps/web/src/styles/globals.css';

const requireToken = async (path, pattern) => {
  const content = await readFile(path, 'utf8');
  assert.match(content, pattern);
};

test('tokens define palette, spacing, radius, and media custom', async () => {
  const content = await readFile(tokenPath, 'utf8');
  assert.match(content, /--color-canvas:\s*#0b0f0e/);
  assert.match(content, /--color-surface:\s*#121816/);
  assert.match(content, /--color-surface-raised:\s*#19221f/);
  assert.match(content, /--color-text:\s*#f1f7f4/);
  assert.match(content, /--color-text-muted:\s*#9fb0aa/);
  assert.match(content, /--color-accent:\s*#63e6be/);
  assert.match(content, /--color-accent-contrast:\s*#07110d/);
  assert.match(content, /--color-danger:\s*#ff7b7b/);
  assert.match(content, /--color-warning:\s*#f4c95d/);
  assert.match(content, /--color-focus:\s*#8cf3d2/);
  assert.match(content, /--space-1:\s*0\.25rem/);
  assert.match(content, /--space-8:\s*2rem/);
  assert.match(content, /--radius-control:\s*0\.5rem/);
  assert.match(content, /--radius-panel:\s*0\.75rem/);
  assert.match(content, /@custom-media\s+--desktop\s*\(width\s*>=\s*1024px\);/);
});

test('globals import tokens and define motion/accessibility foundation', async () => {
  const content = await readFile(globalPath, 'utf8');
  await requireToken(globalPath, /@import\s+['"]\.\/tokens\.css['"]/);
  assert.match(content, /color-scheme:\s*dark/);
  assert.match(content, /box-sizing:\s*border-box/);
  assert.match(content, /font-family:\s*Inter,\s*ui-sans-serif,\s*system-ui,\s*sans-serif/);
  assert.match(content, /:focus-visible\s*{[^}]*outline:\s*2px\s+solid\s+var\(--color-focus\)/s);
  assert.match(content, /@media\s*\([^)]*prefers-reduced-motion:\s*reduce[^)]*\)\s*{/);
  assert.match(content, /scroll-behavior:\s*auto\s*!\s*important/);
});
