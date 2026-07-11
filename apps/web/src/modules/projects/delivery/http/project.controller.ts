import {
  CreateProjectApiSchema,
  createProjectApiToEntity,
  projectEntityToApi,
} from '../../converters/api-entity/project.converter';
import type { CreateProjectService } from '../../application/services/create-project.service';
import type { ListProjectsService } from '../../application/services/list-projects.service';
import type { GetProjectService } from '../../application/services/get-project.service';
import type { DeleteProjectService } from '../../application/services/delete-project.service';
export class ProjectController {
  constructor(
    private readonly createProject: CreateProjectService,
    private readonly listProjects: ListProjectsService,
    private readonly getProject: GetProjectService,
    private readonly deleteProject: DeleteProjectService,
  ) {}
  async create(request: Request) {
    try {
      const parsed = CreateProjectApiSchema.safeParse(await request.json());
      if (!parsed.success)
        return Response.json(
          { code: 'INVALID_PROJECT', issues: parsed.error.issues },
          { status: 400 },
        );
      const result = await this.createProject.execute(
        createProjectApiToEntity(parsed.data),
      );
      return Response.json(projectEntityToApi(result), { status: 201 });
    } catch {
      return Response.json({ code: 'INVALID_PROJECT' }, { status: 400 });
    }
  }
  async list() {
    const values = await this.listProjects.execute();
    return Response.json(
      values.map((project) => projectEntityToApi({ project })),
    );
  }
  async get(id: string) {
    const project = await this.getProject.execute(id);
    return project
      ? Response.json(projectEntityToApi({ project }))
      : Response.json({ code: 'NOT_FOUND' }, { status: 404 });
  }
  async remove(id: string) {
    const removed = await this.deleteProject.execute(id);
    return removed
      ? new Response(null, { status: 204 })
      : Response.json({ code: 'NOT_FOUND' }, { status: 404 });
  }
}
