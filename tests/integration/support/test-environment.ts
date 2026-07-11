export const integrationEnabled = process.env.RUN_INTEGRATION === '1';
export const uniqueId = (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export async function waitFor<T>(read: () => Promise<T>, ready: (value: T) => boolean, timeoutMs = 30_000) { const end = Date.now() + timeoutMs; while (Date.now() < end) { const value = await read(); if (ready(value)) return value; await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error('Timed out waiting for integration service'); }
