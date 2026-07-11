import { settingsComposition } from '../../../modules/settings/composition/settings.composition';
export async function GET() {
  return settingsComposition().controller.exportDiagnostics();
}
