export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.tools/**',
      'apps/worker/.venv/**',
      'apps/web/src/app/layout.tsx',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {},
  },
];
