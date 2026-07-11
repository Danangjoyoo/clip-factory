import { AnalysisRunDataService } from '../data-services/analysis-run.data-service';
import type { AnalysisUnitOfWork } from '../ports/unit-of-work.port';
export class RecordUncertainPaidCallService {
  constructor(
    private readonly uow: AnalysisUnitOfWork,
    private readonly runs: AnalysisRunDataService,
  ) {}
  execute(analysisRunId: string, worstCaseMicrousd: bigint) {
    return this.uow.execute(async (tx) => {
      await this.runs.addUncertain(analysisRunId, worstCaseMicrousd, tx);
      return {
        analysisRunId,
        label: 'possible unreported provider charge (worst-case reservation)',
        uncertainReservedMicrousd: worstCaseMicrousd,
      };
    });
  }
}
