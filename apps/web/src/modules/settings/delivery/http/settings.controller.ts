import { z } from 'zod';
import type { GetHealthService } from '../../application/services/get-health.service';
import type { UpdateSettingsService } from '../../application/services/update-settings.service';
import type { ExportDiagnosticsService } from '../../application/services/export-diagnostics.service';
import type { SettingsEntity } from '../../application/dto/entity/settings-entity.dto';

const schema = z.object({
  allowedRoots: z.array(z.string()),
  defaultPlatform: z.string(),
  captionProfile: z.string(),
  catalogVersion: z.string(),
});
export class SettingsController {
  constructor(
    private readonly store: { get(): Promise<SettingsEntity> },
    private readonly update: UpdateSettingsService,
    private readonly health: GetHealthService,
    private readonly diagnostics: ExportDiagnosticsService,
  ) {}
  async get() {
    return Response.json(await this.store.get());
  }
  async save(request: Request) {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    return parsed.success
      ? Response.json(await this.update.execute(parsed.data), { status: 200 })
      : Response.json({ code: 'INVALID_SETTINGS' }, { status: 400 });
  }
  async healthCheck() {
    return Response.json(await this.health.execute());
  }
  async exportDiagnostics() {
    const bytes = await this.diagnostics.execute([]);
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="diagnostics.json"',
      },
    });
  }
}
