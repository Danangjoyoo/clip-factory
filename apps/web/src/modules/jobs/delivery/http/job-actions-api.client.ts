type JobActionBody = Record<string, string | number | boolean | null>;

export async function postJobAction(
  projectId: string,
  action: string,
  body: unknown = {},
) {
  if (body === null || typeof body !== 'object' || Array.isArray(body))
    throw new TypeError('Job action body must be an object');
  const response = await fetch(`/api/projects/${projectId}/jobs/actions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify({ action, ...(body as JobActionBody) }),
  });
  if (!response.ok) throw new Error(`Job action failed: ${response.status}`);
  return response.json();
}
