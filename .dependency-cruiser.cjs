const layer =
  '(?:^|/)(?:domain|application|adapters|delivery|converters|composition)(?:/|$)';
const inner = '(?:^|/)(?:domain|application)(?:/|$)';
const outer = '(?:^|/)(?:adapters|delivery|converters)(?:/|$)';

module.exports = {
  forbidden: [
    {
      name: 'no-circular-dependencies',
      comment:
        'Dependency cycles make the feature graph impossible to reason about.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'inner-layers-do-not-import-outer-layers',
      comment:
        'Domain and application code depend on policy, not concrete outer layers.',
      severity: 'error',
      from: { path: inner },
      to: {
        path: '(?:^|/)(?:adapters|delivery|converters|composition)(?:/|$)',
      },
    },
    {
      name: 'domain-does-not-import-application',
      comment: 'The domain layer is the innermost policy boundary.',
      severity: 'error',
      from: { path: '(?:^|/)domain(?:/|$)' },
      to: { path: '(?:^|/)application(?:/|$)' },
    },
    {
      name: 'outer-layers-are-peers',
      comment: 'Adapters, delivery, and converters do not import one another.',
      severity: 'error',
      from: { path: outer },
      to: { path: outer },
    },
    {
      name: 'concrete-dependencies-only-in-composition',
      comment:
        'Only composition roots may import concrete adapter implementations.',
      severity: 'error',
      from: { pathNot: '(?:^|/)composition(?:/|$)' },
      to: { path: '(?:^|/)adapters/(?:.*)' },
    },
  ],
  options: {
    parser: 'tsc',
    tsConfig: { fileName: 'apps/web/tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: ['(^|/)node_modules/'],
  },
};
