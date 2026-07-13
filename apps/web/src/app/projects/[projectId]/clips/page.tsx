import { ResultsDashboard } from '../../../../modules/clips/delivery/ui/ResultsDashboard';
import { resultsView } from '../../../../modules/clips/composition/clip-views.composition';

export default async function ClipsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ResultsDashboard clips={await resultsView(projectId)} />;
}
