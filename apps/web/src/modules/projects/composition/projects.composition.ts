import { prisma } from '../../../infrastructure/prisma/client';
import { PrismaProjectRepository } from '../adapters/persistence/repositories/prisma-project.repository';
import { PrismaSourceAssetRepository } from '../adapters/persistence/repositories/prisma-source-asset.repository';
import { ProjectDataService } from '../application/data-services/project.data-service';
import { SourceAssetDataService } from '../application/data-services/source-asset.data-service';
import { CreateProjectService } from '../application/services/create-project.service';
import { ListProjectsService } from '../application/services/list-projects.service';
import { GetProjectService } from '../application/services/get-project.service';
import { DeleteProjectService } from '../application/services/delete-project.service';
import type { UnitOfWork } from '../application/ports/unit-of-work.port';
import type { WorkflowControlPort } from '../application/ports/workflow-control.port';
import type { ArtifactCleanupPort } from '../application/ports/artifact-cleanup.port';
import { ProjectController } from '../delivery/http/project.controller';
import { GetWorkerSourceLocatorService } from '../application/services/get-worker-source-locator.service';
import { ApplySourceValidationService } from '../application/services/apply-source-validation.service';
import { WorkerSourceLocatorController } from '../delivery/http/worker-source-locator.controller';
import { RelinkSourceController } from '../delivery/http/relink-source.controller';
import { RelinkSourceService } from '../application/services/relink-source.service';
import { loadServerEnv } from '../../../config/server-env';
import { PrismaSourceValidationReceiptRepository } from '../adapters/persistence/repositories/prisma-source-validation-receipt.repository';
const uow: UnitOfWork = {
  execute: (fn) => prisma.$transaction((tx) => fn(tx)),
};
const workflows: WorkflowControlPort = { cancel: async () => undefined };
const artifacts: ArtifactCleanupPort = {
  cleanupProject: async () => undefined,
};
export function projectsComposition() {
  const projects = new ProjectDataService(new PrismaProjectRepository());
  const sources = new SourceAssetDataService(new PrismaSourceAssetRepository());
  return {
    controller: new ProjectController(
      new CreateProjectService(uow, projects, sources),
      new ListProjectsService(projects, sources),
      new GetProjectService(projects, sources),
      new DeleteProjectService(uow, projects, sources, workflows, artifacts),
    ),
    workerSourceLocatorController: new WorkerSourceLocatorController(
      new GetWorkerSourceLocatorService(sources),
      new ApplySourceValidationService(
        uow,
        sources,
        new PrismaSourceValidationReceiptRepository(),
      ),
      loadServerEnv().INTERNAL_SERVICE_TOKEN,
    ),
    relinkSourceController: new RelinkSourceController(new RelinkSourceService(uow, sources, workflows, { validateCandidate: async () => { throw new Error('SOURCE_VALIDATION_UNAVAILABLE'); } }), loadServerEnv().INTERNAL_SERVICE_TOKEN),
  };
}
