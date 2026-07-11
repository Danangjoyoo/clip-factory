import { UsageView } from '../../modules/analysis/delivery/ui/UsageView';
import { analysisComposition } from '../../modules/analysis/composition/analysis.composition';
export default async function UsagePage() {
  const report = await analysisComposition().usageReportService.execute();
  return <UsageView report={report} />;
}
