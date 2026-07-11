import { FocalPointApiSchema } from './dto/api/focal-point-api.dto';
import { decimalToMicros } from '../../converters/api-entity/focal-point.converter';
import { SetFocalPointService } from '../../application/services/set-focal-point.service';

export class FocalPointController {
  constructor(private readonly service: SetFocalPointService) {}
  async post(request: Request, clipId: string): Promise<Response> {
    const parsed = FocalPointApiSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return Response.json({ code: 'INVALID_FOCAL_POINT' }, { status: 422 });
    try {
      return Response.json(
        await this.service.execute({
          ...parsed.data,
          clipId,
          xMicros: decimalToMicros(parsed.data.x),
          yMicros: decimalToMicros(parsed.data.y),
        }),
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('INVALID_'))
        return Response.json({ code: error.message }, { status: 422 });
      throw error;
    }
  }
}
