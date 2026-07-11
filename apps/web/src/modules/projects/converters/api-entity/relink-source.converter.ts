import type { z } from 'zod';
import type { RelinkSourceApiSchema } from '../../delivery/http/dto/api/relink-source-api.dto';
export const relinkSourceApiToEntity = (value: z.infer<typeof RelinkSourceApiSchema>) => ({ ...value, sizeBytes: BigInt(value.sizeBytes), modifiedAt: new Date(value.modifiedAt), resolvedPath: value.resolvedPath, probe: value.probe ?? null });
