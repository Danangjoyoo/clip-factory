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
    const { createClient } = await import('redis');
    instance ??= createClient({
      url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/0',
    }) as unknown as Redis;
    await instance.connect();
  },
  ping: async () => (instance as Redis).ping(),
  quit: async () => instance?.quit(),
};
export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
  return redis;
}
