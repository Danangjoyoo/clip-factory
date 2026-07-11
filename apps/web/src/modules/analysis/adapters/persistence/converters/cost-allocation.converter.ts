import type { CostAllocationEntityDto } from '../../../application/dto/entity';
import type { CostAllocationRecordDto } from '../dto/record/cost-allocation-record.dto';
export const costAllocationRecordToEntity = (
  r: CostAllocationRecordDto,
): CostAllocationEntityDto => ({
  ...r,
  label: 'allocated estimate',
  methodLabel: 'equal share',
});
