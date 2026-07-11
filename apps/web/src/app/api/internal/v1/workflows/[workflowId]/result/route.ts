import { jobsComposition } from '../../../../../../../modules/jobs/composition/jobs.composition';
export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> },
) {
  return jobsComposition().workerResultController.apply(
    request,
    (await context.params).workflowId,
  );
}
