import { z } from 'zod';
import type {
  SourceValidationPort,
  ValidatedRelink,
} from '../../application/ports/source-validation.port';

const responseSchema = z.object({
  displayPath: z.string(),
  resolvedPath: z.string(),
  sizeBytes: z.union([z.string(), z.number(), z.bigint()]),
  modifiedAt: z.string().datetime(),
  fingerprint: z.string().min(1),
  probe: z.unknown().nullable().optional(),
});

/** Authenticated boundary to the native worker's source validation endpoint. */
export class HttpSourceValidationClient implements SourceValidationPort {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async validateCandidate(input: {
    sourceAssetId: string;
    candidatePath: string;
  }): Promise<ValidatedRelink> {
    const response = await this.request(
      `${this.baseUrl.replace(/\/$/, '')}/internal/source-validation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok)
      throw new Error(`SOURCE_VALIDATION_FAILED:${response.status}`);
    const value = responseSchema.parse(await response.json());
    return {
      displayPath: value.displayPath,
      resolvedPath: value.resolvedPath,
      sizeBytes: BigInt(value.sizeBytes),
      modifiedAt: new Date(value.modifiedAt),
      fingerprint: value.fingerprint,
      probe: value.probe ?? null,
    };
  }
}
