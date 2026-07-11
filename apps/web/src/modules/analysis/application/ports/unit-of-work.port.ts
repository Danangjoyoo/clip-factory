import type { Prisma } from '../../../../generated/prisma/client';
export type AnalysisTransaction = Prisma.TransactionClient;
export interface AnalysisUnitOfWork {
  execute<T>(fn: (tx: AnalysisTransaction) => Promise<T>): Promise<T>;
}
