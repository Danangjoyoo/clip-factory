import type { CreateProjectEntityDto, ProjectEntityDto } from '../dto/entity';
import type {
  ProjectRepository,
  TransactionContext,
} from '../ports/project.repository';
export class ProjectDataService {
  constructor(private readonly repository: ProjectRepository) {}
  create(input: CreateProjectEntityDto, tx: TransactionContext) {
    return this.repository.insert(input, tx);
  }
  get(id: string) {
    return this.repository.findById(id);
  }
  list() {
    return this.repository.list();
  }
  delete(id: string, tx: TransactionContext) {
    return this.repository.delete(id, tx);
  }
}
