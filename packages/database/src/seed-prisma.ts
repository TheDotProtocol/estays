import { PrismaClient } from '@prisma/client';

/** Single-connection client for remote seeding (Render Postgres has low connection limits). */
export function createSeedPrisma(): PrismaClient {
  const baseUrl = process.env.DATABASE_URL ?? '';
  const separator = baseUrl.includes('?') ? '&' : '?';
  const url = `${baseUrl}${separator}connection_limit=1&pool_timeout=60`;

  return new PrismaClient({
    datasources: { db: { url } },
  });
}

export async function createManyInChunks<T>(
  items: T[],
  chunkSize: number,
  create: (chunk: T[]) => Promise<unknown>
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    await create(items.slice(i, i + chunkSize));
  }
}
