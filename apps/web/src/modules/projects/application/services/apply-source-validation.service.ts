import type { SourceAssetDataService } from '../data-services/source-asset.data-service';
import type {
  ApplySourceValidationCommand,
  SourceValidationAcknowledgement,
} from '../dto/entity/worker-source-locator-entity.dto';
export class ApplySourceValidationService {
  constructor(private readonly sources: SourceAssetDataService) {}
  async execute(
    command: ApplySourceValidationCommand,
  ): Promise<SourceValidationAcknowledgement> {
    const updated = await this.sources.applyValidatedLocator(
      command as never,
      undefined,
    );
    return {
      sourceAssetId: updated.id,
      health: updated.health,
      fingerprint: updated.fingerprint ?? command.fingerprint,
    };
  }
}
