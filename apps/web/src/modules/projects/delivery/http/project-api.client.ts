import type { CreateProjectApiRequest } from '../../converters/api-entity/project.converter';

export type ProjectApi = Readonly<{
  id: string;
  name: string;
  mode: 'AI_HIGHLIGHTS' | 'MANUAL';
  language: string;
  maxClipSeconds: number;
  platform: 'YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' | 'TIKTOK';
  status: string;
  openaiSpendMicrousd: string;
  source: Readonly<{
    id: string;
    kind: string;
    displayLabel: string;
    health: string;
  }> | null;
  createdAt: string;
  updatedAt: string;
}>;

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = (await response.json().catch(() => null)) as {
    code?: string;
  } | null;
  throw new Error(body?.code ?? `HTTP_${response.status}`);
}

export async function listProjects(
  signal?: AbortSignal,
): Promise<ProjectApi[]> {
  const init: RequestInit = {};
  if (signal) init.signal = signal;
  return readJson<ProjectApi[]>(await fetch('/api/projects', init));
}

export async function createProject(
  input: CreateProjectApiRequest,
  signal?: AbortSignal,
): Promise<ProjectApi> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  };
  if (signal) init.signal = signal;
  return readJson<ProjectApi>(await fetch('/api/projects', init));
}
