import { storageComposition } from '../../../../../../../modules/storage/composition/storage.composition';
import { UploadController } from '../../../../../../../modules/storage/delivery/http/upload.controller';
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  try {
    const { projectId, sessionId } = await context.params;
    return Response.json(
      await storageComposition().controller.completeUpload(
        projectId,
        sessionId,
        await request.json(),
      ),
    );
  } catch (error) {
    return UploadController.error(error);
  }
}
