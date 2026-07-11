export type JobTransaction = unknown;
export interface UnitOfWork {
  execute<T>(fn: (tx: JobTransaction) => Promise<T>): Promise<T>;
}
