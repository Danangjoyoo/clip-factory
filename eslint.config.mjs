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
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {},
  },
];
