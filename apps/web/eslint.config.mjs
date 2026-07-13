const providerModules = [
  '@prisma/client',
  'next',
  'react',
  'redis',
  'ioredis',
  'openai',
  'googleapis',
  'google-auth-library',
];

const providerPatterns = [
  '@aws-sdk/**',
  '@temporalio/**',
  'openai/**',
  'googleapis/**',
  'google-auth-library/**',
];

const boundaryPatterns = [
  '**/generated/**',
  '**/dto/api/**',
  '**/dto/record/**',
  '**/dto/client/**',
];

export default [
  // TypeScript 7 has no compatible ESLint parser in the pinned toolchain.
  // `tsc --noEmit` remains the authoritative TypeScript syntax/type gate.
  { ignores: ['src/**/*.{ts,tsx}', '**/*.ts', '**/*.tsx'] },
  {
    // Espree covers JavaScript/config fixtures; the custom scanner owns TS/TSX
    // boundary policy until a TypeScript 7-compatible parser is available.
    files: ['src/**/domain/**/*.{js,mjs}', 'src/**/application/**/*.{js,mjs}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: providerModules.map((name) => ({
            name,
            message:
              'Domain and application code must use application-owned ports.',
          })),
          patterns: [
            ...providerPatterns.map((group) => ({
              group: [group],
              message:
                'Domain and application code must use application-owned ports.',
            })),
            ...boundaryPatterns.map((group) => ({
              group: [group],
              message:
                'Boundary DTOs and generated types must stay at their owning boundary.',
            })),
          ],
        },
      ],
    },
  },
];
