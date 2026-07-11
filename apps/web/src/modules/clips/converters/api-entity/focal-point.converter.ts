export const decimalToMicros = (value: string): number => {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error('INVALID_FOCAL_POINT');
  const [whole, fraction = ''] = value.split('.');
  const micros = Number(`${fraction.slice(0, 6).padEnd(6, '0') || '0'}`) + (Number(fraction[6] ?? 0) >= 5 ? 1 : 0);
  const result = Number(whole) * 1_000_000 + micros;
  if (!Number.isSafeInteger(result) || result > 1_000_000) throw new Error('INVALID_FOCAL_POINT');
  return result;
};
