import { storageComposition } from '../../../../../modules/storage/composition/storage.composition';
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) { const body = await request.json(); return Response.json(await storageComposition().start.startUpload((await context.params).projectId, body)); }
