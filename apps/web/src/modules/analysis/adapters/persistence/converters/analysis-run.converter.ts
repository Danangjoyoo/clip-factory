import type { AnalysisRunEntityDto } from '../../../application/dto/entity';
import type { AnalysisRunRecordDto } from '../dto/record/analysis-run-record.dto';
export const analysisRunRecordToEntity = (r: AnalysisRunRecordDto): AnalysisRunEntityDto => ({ ...r });
