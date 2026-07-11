import { RebuildLiveProjectionsService } from '../../modules/jobs/application/services/rebuild-live-projections.service';
export async function reconcileJobs(service: RebuildLiveProjectionsService, projectIds: string[]) {
  await Promise.all(projectIds.map((id) => service.execute(id)));
}
