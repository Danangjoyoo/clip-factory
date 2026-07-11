export function parseSize(value: string): bigint { if (!/^\d+$/u.test(value)) throw new Error('invalid size'); return BigInt(value); }
export function sizeToApi(value: bigint): string { return value.toString(); }
