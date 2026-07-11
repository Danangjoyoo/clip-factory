import { createConnection } from 'node:net';
export function tcpHealth(component: string, address: string) {
  return {
    component,
    check: () =>
      new Promise<{ status: 'HEALTHY' }>((resolve, reject) => {
        let url: URL;
        try {
          url = new URL(address.includes('://') ? address : `tcp://${address}`);
        } catch {
          reject(new Error('invalid address'));
          return;
        }
        const socket = createConnection({
          host: url.hostname,
          port: Number(url.port) || 80,
        });
        const finish = (error?: Error) => {
          socket.destroy();
          error ? reject(error) : resolve({ status: 'HEALTHY' });
        };
        socket
          .setTimeout(1000, () => finish(new Error('timeout')))
          .once('connect', () => finish())
          .once('error', finish);
      }),
  };
}
