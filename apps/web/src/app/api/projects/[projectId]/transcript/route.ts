import { loadProjectTranscript } from '../../../../../modules/transcription/composition/transcript-artifact';

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const transcript = await loadProjectTranscript(projectId);
  if (!transcript)
    return Response.json({ error: 'TRANSCRIPT_NOT_FOUND' }, { status: 404 });
  return new Response(transcript.text, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'content-disposition': 'attachment; filename="transcript.txt"',
    },
  });
}
