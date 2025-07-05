import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import WebSocket from 'ws';
import { once } from 'events';

describe('status broadcast after control actions', () => {
  let serverProcess: ChildProcessWithoutNullStreams;
  const port = 8126;

  beforeAll(async () => {
    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    await new Promise<void>(resolve => {
      const onData = (data: Buffer) => {
        if (data.toString().includes('Server listening')) {
          serverProcess.stdout.off('data', onData);
          resolve();
        }
      };
      serverProcess.stdout.on('data', onData);
    });
  }, 10000);

  afterAll(() => {
    serverProcess.kill();
  });

  const cases = [
    { path: '/api/reset', action: 'reset' },
    { path: '/api/reset-time', action: 'reset-time' },
    { path: '/api/reset-rounds', action: 'reset-rounds' },
    { path: '/api/next-round', action: 'next-round' },
    { path: '/api/previous-round', action: 'previous-round' }
  ];

  test.each(cases)('%s triggers status broadcast', async ({ path, action }) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await once(ws, 'open');

    // flush initial status message
    await new Promise(res => setTimeout(res, 50));
    const messages: any[] = [];
    ws.on('message', msg => messages.push(JSON.parse(msg.toString())));

    await fetch(`http://localhost:${port}${path}`, { method: 'POST' });

    await new Promise(res => setTimeout(res, 200));

    const actionIndex = messages.findIndex(m => m.action === action);
    const statusAfter = messages.find((m, i) => i > actionIndex && m.type === 'status');

    expect(actionIndex).not.toBe(-1);
    expect(statusAfter).toBeDefined();

    ws.close();
  });
});
