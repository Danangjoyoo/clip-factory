import type { PlatformPreset } from '../../../projects/domain/project';
type Preset = { id: PlatformPreset; safeArea: { top: number; right: number; bottom: number; left: number } };
export function SafeAreaOverlay({ preset }: Readonly<{ preset: Preset }>) {
  const { top, right, bottom, left } = preset.safeArea;
  return <div className="safeArea" style={{ top: `${top * 100}%`, right: `${right * 100}%`, bottom: `${bottom * 100}%`, left: `${left * 100}%` }} aria-hidden="true" data-preset={preset.id} />;
}
