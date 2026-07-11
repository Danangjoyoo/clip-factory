import type { SettingsEntity } from '../dto/entity/settings-entity.dto';
import type { SettingsStore } from '../ports/settings-store.port';
export class UpdateSettingsService { constructor(private readonly store: SettingsStore) {} execute(settings: SettingsEntity) { if (settings.allowedRoots.some((root) => !root.startsWith('/'))) throw new Error('INVALID_ALLOWED_ROOT'); return this.store.save(settings); } }
