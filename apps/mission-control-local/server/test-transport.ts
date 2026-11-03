// Test helper. Some review sandboxes refuse every local socket, which would stop the whole
// suite running there. Requests then travel over an in-memory stream through the same HTTP
// server code, and only tests that need a real socket skip, by name. CI must have sockets.
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { duplexPair } from 'node:stream';

async function probeLoopback(): Promise<boolean> {
  const probe = createServer();
  return new Promise((resolve, reject) => {
    probe.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EPERM' && !process.env.CI) resolve(false);
      else reject(err);
    });
    probe.listen(0, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}

export const LOOPBACK = await probeLoopback();
export const NEEDS_SOCKET: string | false = LOOPBACK ? false : 'this sandbox refuses local sockets (listen EPERM)';

export function memoryConnection(server: Server) {
  const [client, serverSide] = duplexPair();
  server.emit('connection', serverSide);
  return client;
}
