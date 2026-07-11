import type {
  ProjectRepository,
  TransactionContext,
} from '../../../application/ports/project.repository';
import type {
  CreateProjectEntityDto,
  ProjectEntityDto,
} from '../../../application/dto/entity';
import {
  projectEntityToRecord,
  projectRecordToEntity,
} from '../converters/project.converter';
import { prisma } from '../../../../../infrastructure/prisma/client';
export class PrismaProjectRepository implements ProjectRepository {
  private db(tx: TransactionContext) {
    return (
      (tx as { project?: typeof prisma.project } | undefined)?.project ??
      prisma.project
    );
  }
  async insert(input: CreateProjectEntityDto, tx: TransactionContext) {
    const r = await this.db(tx).create({ data: projectEntityToRecord(input) });
    return projectRecordToEntity(r);
  }
  async findById(id: string) {
    const r = await prisma.project.findUnique({ where: { id } });
    return r ? projectRecordToEntity(r) : null;
  }
  async list() {
    const rows = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(projectRecordToEntity);
  }
  async delete(id: string, tx: TransactionContext) {
    await this.db(tx).delete({ where: { id } });
  }
}
