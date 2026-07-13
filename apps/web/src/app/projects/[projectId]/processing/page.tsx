import { ProcessingLocalPage } from '../../../../modules/jobs/delivery/ui/ProcessingLocalPage';

export default async function ProcessingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProcessingLocalPage projectId={projectId} />;
}
