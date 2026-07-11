import { useEffect, useState } from 'react';
export function useProjectEvents(projectId: string, initial: unknown) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const controller = new AbortController();
    let source: EventSource | undefined;
    let delay = 1000;
    const connect = () => {
      if (controller.signal.aborted) return;
      source = new EventSource(`/api/projects/${projectId}/events`);
      source.onmessage = (event) => {
        try {
          setValue(JSON.parse(event.data));
          delay = 1000;
        } catch {
          /* ignore malformed event */
        }
      };
      source.onerror = () => {
        source?.close();
        setTimeout(connect, delay);
        delay = Math.min(delay * 2, 15000);
      };
    };
    connect();
    return () => {
      controller.abort();
      source?.close();
    };
  }, [projectId]);
  return value;
}
