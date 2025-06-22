
import express from 'express';
import path from 'path';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let lastStatus = null;

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
