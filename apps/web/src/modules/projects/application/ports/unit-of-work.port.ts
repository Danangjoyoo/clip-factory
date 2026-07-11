import type { TransactionContext } from './project.repository';
export interface UnitOfWork {
  execute<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
