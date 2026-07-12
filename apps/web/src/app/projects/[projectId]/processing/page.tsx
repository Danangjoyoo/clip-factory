import { ProcessingView } from '../../../../modules/jobs/delivery/ui/ProcessingView';
export default async function ProcessingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <>
      <ProcessingView
        value={{
          projectId,
          state: 'RUNNING',
          stage: 'Processing',
          percent: 0,
          eta: null,
          stages: [],
          workerOnline: true,
          logs: [],
          analysisVersion: '',
          analysisId: '',
        }}
      />
      <nav aria-label="Project results">
        <a href={`/projects/${projectId}/clips`}>View local results</a>
      </nav>
    </>
  );
}
