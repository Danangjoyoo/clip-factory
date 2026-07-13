import { describe, expect, it } from 'vitest';
import type { SettingsEntity } from '../../application/dto/entity/settings-entity.dto';
import { UpdateSettingsService } from '../../application/services/update-settings.service';
import { SettingsController } from './settings.controller';

function controller(initial?: Partial<SettingsEntity>) {
  let current: SettingsEntity = {
    allowedRoots: [],
    defaultPlatform: 'youtube',
    captionProfile: 'default',
    catalogVersion: 'local',
    ...initial,
    openAiApiKey: initial?.openAiApiKey ?? '',
  };
  const store = {
    get: async () => current,
    save: async (settings: SettingsEntity) => {
      current = settings;
      return current;
    },
  };
  return new SettingsController(
    store,
    new UpdateSettingsService(store),
    { execute: async () => ({ status: 'HEALTHY', components: [] }) } as never,
    { execute: async () => new Uint8Array() } as never,
  );
}

describe('SettingsController', () => {
  it('saves an OpenAI API key and returns only configured state', async () => {
    const response = await controller().save(
      new Request('http://localhost/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          allowedRoots: [],
          defaultPlatform: 'youtube',
          captionProfile: 'default',
          catalogVersion: 'local',
          openAiApiKey: 'sk-test-key',
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openAiApiKey).toBeUndefined();
    expect(body.openAiApiKeyConfigured).toBe(true);
  });

  it('redacts a stored OpenAI API key from settings reads', async () => {
    const response = await controller({ openAiApiKey: 'sk-test-key' }).get();

    const body = await response.json();
    expect(body.openAiApiKey).toBeUndefined();
    expect(body.openAiApiKeyConfigured).toBe(true);
  });
});
