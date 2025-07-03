import { NTPSyncManager } from '../src/utils/ntpSync';

let createSocketMock: any;

jest.mock('dgram', () => ({
  createSocket: (...args: any[]) => createSocketMock(...args),
}), { virtual: false });

describe('NTPSyncManager', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('computes offset from UDP response', async () => {
    createSocketMock = () => {
      const events: Record<string, any> = {};
      return {
        send: jest.fn((buf: Buffer, o: number, l: number, port: number, addr: string, cb: any) => {
          cb && cb(null);
          setImmediate(() => {
            const msg = Buffer.alloc(48);
            const writeTs = (b: Buffer, off: number, ms: number) => {
              const sec = Math.floor(ms / 1000) + 2208988800;
              const frac = Math.floor(((ms % 1000) / 1000) * 2 ** 32);
              b.writeUInt32BE(sec, off);
              b.writeUInt32BE(frac, off + 4);
            };
            writeTs(msg, 24, 1000); // originate
            writeTs(msg, 32, 1600); // receive
            writeTs(msg, 40, 1700); // transmit
            events['message'](msg);
          });
        }),
        once: jest.fn((ev: string, handler: any) => { events[ev] = handler; }),
        close: jest.fn(),
      };
    };

    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValueOnce(1000).mockReturnValueOnce(2000);

    const manager = new NTPSyncManager({ servers: [], syncInterval: 0, driftThreshold: 0, maxRetries: 0 });
    const result = await (manager as any).queryUdpTime('test');
    expect(Math.round(result.offset)).toBe(150);
  });

  test('falls back to HTTP when UDP fails', async () => {
    createSocketMock = () => {
      const events: Record<string, any> = {};
      return {
        send: jest.fn(() => {
          events['error'](new Error('fail'));
        }),
        once: jest.fn((ev: string, handler: any) => { events[ev] = handler; }),
        close: jest.fn(),
      };
    };

    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy
      .mockReturnValueOnce(1000) // udp now
      .mockReturnValueOnce(3000) // http before
      .mockReturnValueOnce(3200); // http after

    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ utc_datetime: new Date(3400).toISOString() }),
      })
    );

    const manager = new NTPSyncManager({ servers: [], syncInterval: 0, driftThreshold: 0, maxRetries: 0 });
    const result = await manager.syncWithNTP('test');
    expect(Math.round(result.offset)).toBe(300);
  });

  test('retries NTP sync according to maxRetries', async () => {
    const manager = new NTPSyncManager({
      servers: ['a'],
      syncInterval: 0,
      driftThreshold: 0,
      maxRetries: 2
    });

    const mockResult = { offset: 10, delay: 0, timestamp: 0 } as any;
    const syncSpy = jest
      .spyOn(manager, 'syncWithNTP')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(mockResult);

    await manager.performSync();

    expect(syncSpy).toHaveBeenCalledTimes(2);
  });
});
