
import express from 'express';
import path from 'path';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import dgram from 'dgram';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let lastStatus = null;

function queryNtpTime(server) {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const packet = Buffer.alloc(48);
    packet[0] = 0x1b; // NTP client request

    const timeout = setTimeout(() => {
      client.close();
      reject(new Error('NTP request timed out'));
    }, 10000);

    client.once('error', err => {
      clearTimeout(timeout);
      client.close();
      reject(err);
    });

    client.once('message', msg => {
      clearTimeout(timeout);
      client.close();
      const seconds = msg.readUInt32BE(40) - 2208988800;
      resolve(seconds * 1000);
    });

    client.send(packet, 0, packet.length, 123, server, err => {
      if (err) {
        clearTimeout(timeout);
        client.close();
        reject(err);
      }
    });
  });
}

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', ws => {
  if (lastStatus) {
    ws.send(JSON.stringify({ type: 'status', ...lastStatus }));
  }

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'status') {
        lastStatus = { ...data };
        broadcast({ type: 'status', ...data });
      }
    } catch (err) {
      console.error('Invalid WS message', err);
    }
  });
});

app.post('/api/start', (_req, res) => {
  broadcast({ action: 'start' });
  res.json({ success: true });
});

app.post('/api/pause', (_req, res) => {
  broadcast({ action: 'pause' });
  res.json({ success: true });
});

app.post('/api/reset', (_req, res) => {
  broadcast({ action: 'reset' });
  res.json({ success: true });
});

app.post('/api/next-round', (_req, res) => {
  broadcast({ action: 'next-round' });
  res.json({ success: true });
});

app.post('/api/previous-round', (_req, res) => {
  broadcast({ action: 'previous-round' });
  res.json({ success: true });
});

app.post('/api/set-time', (req, res) => {
  const { minutes, seconds } = req.body;
  broadcast({ action: 'set-time', minutes, seconds });
  res.json({ success: true });
});

app.post('/api/set-rounds', (req, res) => {
  const { rounds } = req.body;
  broadcast({ action: 'set-rounds', rounds });
  res.json({ success: true });
});

app.get('/api/ntp-sync', async (req, res) => {
  const ntpServer = req.query.server || 'time.google.com';
  try {
    const before = Date.now();
    const serverTime = await queryNtpTime(ntpServer);
    const after = Date.now();
    const networkDelay = (after - before) / 2;
    const clientTime = before + networkDelay;
    const offset = serverTime - clientTime;
    res.json({ offset, lastSync: new Date().toISOString() });
  } catch (err) {
    console.error('NTP sync failed:', err);
    res.status(500).json({ error: 'NTP sync failed' });
  }
});

app.get('/api/status', (_req, res) => {
  if (lastStatus) {
    res.json(lastStatus);
  } else {
    res.json({});
  }
});

const dist = join(__dirname, 'dist');
app.use(express.static(dist));
app.get('*', (_req, res) => {
  res.sendFile(join(dist, 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
