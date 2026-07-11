import { storageComposition } from '../../../../../modules/storage/composition/storage.composition';
import { UploadController } from '../../../../../modules/storage/delivery/http/upload.controller';
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    return Response.json(
      await storageComposition().start.startUpload(
        (await context.params).projectId,
        await request.json(),
      ),
    );
  } catch (error) {
    return UploadController.error(error);
  }
}
