import type { PaidCallReservationRepository } from '../ports/paid-call-reservation.repository';
import type { AnalysisTransaction } from '../ports/unit-of-work.port';
export class PaidCallReservationDataService {
  constructor(private readonly repository: PaidCallReservationRepository) {}
  lockByCallId(id: string, tx?: AnalysisTransaction) {
    return this.repository.lockByCallId(id, tx);
  }
  complete(
    input: Parameters<PaidCallReservationRepository['complete']>[0],
    tx?: AnalysisTransaction,
  ) {
    return this.repository.complete(input, tx);
  }
}
