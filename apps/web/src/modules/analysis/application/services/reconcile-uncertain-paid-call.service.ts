import { RecordUsageService, type UsageEntityInput } from './record-usage.service';

export class ReconcileUncertainPaidCallService {
  constructor(
    private readonly usage: RecordUsageService,
  ) {}

  execute(input: UsageEntityInput, reservedMicrousd: bigint) {
    return this.usage.execute({ ...input, uncertainReservedMicrousd: reservedMicrousd });
  }
}
