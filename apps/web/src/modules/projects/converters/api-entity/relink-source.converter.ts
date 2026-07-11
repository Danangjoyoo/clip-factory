import type { z } from 'zod';
import type { RelinkSourceApiSchema } from '../../delivery/http/dto/api/relink-source-api.dto';
export const relinkSourceApiToEntity = (value: z.infer<typeof RelinkSourceApiSchema>) => ({ displayPath: value.displayPath, resolvedPath: value.resolvedPath });
