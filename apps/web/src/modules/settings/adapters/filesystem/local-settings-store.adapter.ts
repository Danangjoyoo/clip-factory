import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { SettingsEntity } from '../../application/dto/entity/settings-entity.dto';
import type { SettingsStore } from '../../application/ports/settings-store.port';

const defaults: SettingsEntity = {
  allowedRoots: [],
  defaultPlatform: 'youtube',
  captionProfile: 'default',
  catalogVersion: 'local',
};

export class LocalSettingsStoreAdapter implements SettingsStore {
  constructor(
    private readonly file = process.env.SETTINGS_FILE ?? '.data/settings.json',
  ) {}
  async get() {
    try {
      return {
        ...defaults,
        ...JSON.parse(await readFile(this.file, 'utf8')),
      } as SettingsEntity;
    } catch {
      return defaults;
    }
  }
  async save(settings: SettingsEntity) {
    await mkdir(dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify(settings, null, 2), { mode: 0o600 });
    await rename(temp, this.file);
    return settings;
  }
}
