import { settingsComposition } from '../../../modules/settings/composition/settings.composition';
export async function GET() {
  return settingsComposition().controller.get();
}
export async function PUT(request: Request) {
  return settingsComposition().controller.save(request);
}
