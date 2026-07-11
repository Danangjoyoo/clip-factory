import { expect, it } from 'vitest';
import { RelinkSourceApiSchema } from '../../delivery/http/dto/api/relink-source-api.dto';
import { relinkSourceApiToEntity } from './relink-source.converter';

it('accepts only candidate path and never serializes client metadata', () => {
  const value = RelinkSourceApiSchema.parse({
    displayPath: 'new',
    resolvedPath: '/tmp/new',
  });
  expect(relinkSourceApiToEntity(value)).toEqual({
    displayPath: 'new',
    resolvedPath: '/tmp/new',
  });
});
