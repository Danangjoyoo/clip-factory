export type AnalysisTransaction = unknown;
export interface AnalysisUnitOfWork {
  execute<T>(fn: (tx: AnalysisTransaction) => Promise<T>): Promise<T>;
}
