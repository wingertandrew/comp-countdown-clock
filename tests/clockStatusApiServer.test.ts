import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { once } from 'events';

describe('/clock_status integration', () => {
  let serverProcess: ChildProcessWithoutNullStreams;
  const port = 8130;

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

  test('reports endTime and timeStamp', async () => {
    await fetch(`http://localhost:${port}/api/start`, { method: 'POST' });
    await new Promise(res => setTimeout(res, 100));

    const res = await fetch(`http://localhost:${port}/clock_status`);
    const json = await res.json();

    expect(typeof json.endTime).toBe('string');
    expect(typeof json.timeStamp).toBe('string');
  });

  test('updates timeStamp when paused', async () => {
    const first = await fetch(`http://localhost:${port}/clock_status`).then(r => r.json());
    await fetch(`http://localhost:${port}/api/pause`, { method: 'POST' });
    await new Promise(res => setTimeout(res, 100));
    const second = await fetch(`http://localhost:${port}/clock_status`).then(r => r.json());
    expect(new Date(second.timeStamp).getTime()).toBeGreaterThan(new Date(first.timeStamp).getTime());
  });
});
