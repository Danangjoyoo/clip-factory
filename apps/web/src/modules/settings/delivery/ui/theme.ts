export const themeIds = ['tactile', 'midnight', 'signal'] as const;

export type ThemeId = (typeof themeIds)[number];

export const themeStorageKey = 'clip-factory.theme';

export const isThemeId = (value: string | null): value is ThemeId =>
  themeIds.includes(value as ThemeId);
