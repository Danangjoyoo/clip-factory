export async function makePrismaTestClient() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for integration tests');
  return (await import('../../../apps/web/src/infrastructure/prisma/client'))
    .prisma;
}

export async function resetDatabase() {
  const prisma = await makePrismaTestClient();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE projects CASCADE');
}
