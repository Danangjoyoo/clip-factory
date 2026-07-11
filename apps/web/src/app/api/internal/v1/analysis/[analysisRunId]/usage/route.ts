import { analysisComposition } from '../../../../../../../modules/analysis/composition/analysis.composition';
export async function POST(
  request: Request,
  context: { params: Promise<{ analysisRunId: string }> },
) {
  const { analysisRunId } = await context.params;
  return analysisComposition().usageCallbackController.handle(
    request,
    analysisRunId,
  );
}
