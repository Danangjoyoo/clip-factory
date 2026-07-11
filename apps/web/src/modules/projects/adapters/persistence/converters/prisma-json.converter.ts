import type { InputJsonValue } from '../../../../../generated/prisma/internal/prismaNamespace';

/** Convert validated application metadata into Prisma's non-null JSON input type. */
export function toPrismaJsonInput(value: unknown): InputJsonValue {
  const converted = convert(value, false);
  if (converted === null)
    throw new TypeError('Top-level JSON metadata cannot be null');
  return converted;
}

function convert(value: unknown, nested: boolean): InputJsonValue | null {
  if (value === null) {
    if (nested) return null;
    throw new TypeError('Top-level JSON metadata cannot be null');
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  if (Array.isArray(value)) return value.map((entry) => convert(entry, true));
  if (typeof value === 'object') {
    const result: Record<string, InputJsonValue | null> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) result[key] = convert(entry, true);
    }
    return result;
  }
  throw new TypeError('JSON metadata must contain only JSON-compatible values');
}
