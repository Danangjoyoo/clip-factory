import { createRequire } from 'node:module';

const requireFromWeb = createRequire(
  new URL('../../../apps/web/package.json', import.meta.url),
);
type Redis = {
  isOpen: boolean;
  connect: () => Promise<void>;
  ping: () => Promise<string>;
  quit: () => Promise<void>;
};
let instance: Redis | undefined;
export const redis = {
  get isOpen() {
    return instance?.isOpen ?? false;
  },
  connect: async () => {
    const { createClient } = requireFromWeb('redis') as {
      createClient: (options: { url: string }) => Redis;
    };
    instance ??= createClient({
      url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/0',
    });
    await instance.connect();
  },
  ping: async () => (instance as Redis).ping(),
  quit: async () => instance?.quit(),
};
export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
  return redis;
}
