import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import WebSocket from 'ws';
import { once } from 'events';

describe('sync-settings websocket handler', () => {
  let serverProcess: ChildProcessWithoutNullStreams;
  const port = 8125;

  beforeAll(async () => {
    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    await new Promise<void>((resolve, reject) => {
      const onData = (data: Buffer) => {
        const text = data.toString();
        if (text.includes('Server listening')) {
          serverProcess.stdout.off('data', onData);
          resolve();
        }
      };
      serverProcess.stdout.on('data', onData);
      serverProcess.stderr.on('data', data => {
        console.error(data.toString());
      });
    });
  }, 10000);

  afterAll(() => {
    serverProcess.kill();
  });

  test('updates NTP config', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await once(ws, 'open');

    ws.send(
      JSON.stringify({
        type: 'sync-settings',
        ntpSyncInterval: 1234,
        ntpDriftThreshold: 42
      })
    );

    await new Promise(res => setTimeout(res, 200));

    const res = await fetch(
      `http://localhost:${port}/api/status?fields=ntpSyncInterval,ntpDriftThreshold`
    );
    const json = await res.json();

    expect(json.ntpSyncInterval).toBe(1234);
    expect(json.ntpDriftThreshold).toBe(42);

    ws.close();
  });
});
