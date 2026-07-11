const providerModules = [
  '@prisma/client',
  'next',
  'react',
  'redis',
  'ioredis',
  'openai',
];

const providerPatterns = ['@aws-sdk/**', '@temporalio/**', 'openai/**'];

const boundaryPatterns = [
  '**/generated/**',
  '**/dto/api/**',
  '**/dto/record/**',
  '**/dto/client/**',
];

export default [
  { ignores: ['src/app/layout.tsx'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    files: ['src/**/domain/**/*.{ts,tsx}', 'src/**/application/**/*.{ts,tsx}'],
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
