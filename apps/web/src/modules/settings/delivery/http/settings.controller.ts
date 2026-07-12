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
  openAiApiKey: z.string().optional(),
});
const view = (settings: SettingsEntity) => {
  const { openAiApiKey: _, ...safe } = settings;
  return {
    ...safe,
    openAiApiKeyConfigured: Boolean(
      settings.openAiApiKey || process.env.OPENAI_API_KEY,
    ),
  };
};
export class SettingsController {
  constructor(
    private readonly store: { get(): Promise<SettingsEntity> },
    private readonly update: UpdateSettingsService,
    private readonly health: GetHealthService,
    private readonly diagnostics: ExportDiagnosticsService,
  ) {}
  async get() {
    return Response.json(view(await this.store.get()));
  }
  async save(request: Request) {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ code: 'INVALID_SETTINGS' }, { status: 400 });
    const current = await this.store.get();
    const openAiApiKey = parsed.data.openAiApiKey?.trim();
    return Response.json(
      view(
        await this.update.execute({
          ...current,
          ...parsed.data,
          openAiApiKey: openAiApiKey || current.openAiApiKey,
        }),
      ),
      { status: 200 },
    );
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
