import { formatTimecode } from '../../domain/timecode';

export const addClip = async (
  projectId: string,
  input: { startMs: number; endMs: number },
) => {
  const response = await fetch(`/api/projects/${projectId}/clips`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      start: formatTimecode(input.startMs),
      end: formatTimecode(input.endMs),
    }),
  });
  if (!response.ok) throw new Error('Unable to add clip');
  return response.json();
};
