import { analysisComposition } from '../../../modules/analysis/composition/analysis.composition';
export async function GET(request: Request) {
  return analysisComposition().usageReportController.handle(request);
}
