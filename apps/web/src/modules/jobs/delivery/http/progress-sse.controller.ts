import type { LiveProjectionPort } from '../../application/ports/live-projection.port';
export class ProgressSseController {
  constructor(private readonly live: LiveProjectionPort) {}
  async stream(request: Request, projectId: string) {
    const encoder = new TextEncoder();
    const last = request.headers.get('last-event-id') ?? '0-0';
    const live = this.live;
    const stream = new ReadableStream({
      async start(controller) {
        const abort = () => controller.close();
        request.signal.addEventListener('abort', abort, { once: true });
        try {
          for await (const item of live.events(
            projectId,
            last,
            request.signal,
          )) {
            controller.enqueue(
              encoder.encode(
                item.comment
                  ? ': keepalive\n\n'
                  : `id: ${item.id}\ndata: ${JSON.stringify(item.event)}\n\n`,
              ),
            );
          }
        } finally {
          request.signal.removeEventListener('abort', abort);
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }
}
