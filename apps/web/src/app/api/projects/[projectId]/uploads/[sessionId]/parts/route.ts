import { storageComposition } from '../../../../../../../modules/storage/composition/storage.composition';
import { UploadController } from '../../../../../../../modules/storage/delivery/http/upload.controller';
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  try {
    const { projectId, sessionId } = await context.params;
    const totalParts = Number(
      new URL(request.url).searchParams.get('totalParts'),
    );
    return Response.json(
      await storageComposition().controller.resumeUpload(
        projectId,
        sessionId,
        totalParts,
      ),
    );
  } catch (error) {
    return UploadController.error(error);
  }
}
