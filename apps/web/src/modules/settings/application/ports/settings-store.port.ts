import type { SettingsEntity } from '../dto/entity/settings-entity.dto';
export interface SettingsStore { get(): Promise<SettingsEntity>; save(settings: SettingsEntity): Promise<SettingsEntity>; }
