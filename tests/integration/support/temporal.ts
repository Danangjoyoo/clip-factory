import { Socket } from 'node:net';

export const temporalAddress = process.env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233';
export async function temporalHealth() {
  const [host = '127.0.0.1', port = '7233'] = temporalAddress.split(':');
  return new Promise<boolean>((resolve) => {
    const socket = new Socket();
    const finish = (healthy: boolean) => {
      socket.destroy();
      resolve(healthy);
    };
    socket.setTimeout(2_000);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
    socket.connect(Number(port), host);
  });
}
