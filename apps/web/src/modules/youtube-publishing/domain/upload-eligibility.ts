export function assertYouTubeShortsEligible(render: {
  status: string;
  width: number;
  height: number;
  durationMs: number;
}): void {
  if (render.status !== 'COMPLETED') throw new Error('render is not completed');
  if (render.width * 16 !== render.height * 9)
    throw new Error('render must be 9:16');
  if (render.durationMs > 180_000)
    throw new Error('render exceeds 180 seconds');
}
