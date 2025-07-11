import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import dgram from 'dgram';
import https from 'https';
import os from 'os';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import play from 'play-sound';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const audioPlayer = play();
let warningPlayed = false;
let endPlayed = false;
let lastRound = 1;

// Audio uploads
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`)
});
const upload = multer({ storage });

// Server-side clock state
let serverClockState = {
  minutes: 5,
  seconds: 0,
  currentRound: 1,
  totalRounds: 3,
  isRunning: false,
  isPaused: false,
  elapsedMinutes: 0,
  elapsedSeconds: 0,
  pauseStartTime: null,
  totalPausedTime: 0,
  currentPauseDuration: 0,
  isBetweenRounds: false,
  betweenRoundsMinutes: 0,
  betweenRoundsSeconds: 0,
  initialTime: { minutes: 5, seconds: 0 },
  startTime: { minutes: 5, seconds: 0 },
  betweenRoundsEnabled: true,
  betweenRoundsTime: 60,
  warningSoundPath: null,
  endSoundPath: null,
  lastUpdateTime: Date.now(),
  ntpTimestamp: null,
  ntpSyncEnabled: false,
  ntpOffset: 0,
  ntpSyncInterval: Number(process.env.NTP_SYNC_INTERVAL) || 1800000,
  ntpDriftThreshold: Number(process.env.NTP_DRIFT_THRESHOLD) || 50,
  endTime: null,
  timeStamp: null
};

serverClockState.timeStamp = Date.now();
serverClockState.endTime = new Date(
  serverClockState.timeStamp +
    (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
).toISOString();

let serverTimer = null;
let ntpSyncTimer = null;

// Track connected WebSocket clients
const connectedClients = new Map();
const clockStatusVisitors = new Map();

function broadcastClockStatusVisitors() {
  const visitors = Array.from(clockStatusVisitors.entries()).map(([ip, ts]) => ({
    ip,
    lastRequestTime: ts
  }));
  broadcast({ type: 'clock_status_visitors', visitors });
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function normalizeIp(ip) {
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

function resetAudioFlags() {
  warningPlayed = false;
  endPlayed = false;
  lastRound = serverClockState.currentRound;
}

function playLocalAudio(fileUrl) {
  if (!fileUrl) return;
  const filePath = join(__dirname, fileUrl.replace(/^\//, ''));
  audioPlayer.play(filePath, err => {
    if (err) {
      console.error('Audio playback failed:', err);
    }
  });
}

function checkAndPlayAudio() {
  if (serverClockState.currentRound !== lastRound) {
    resetAudioFlags();
  }
  if (
    serverClockState.isRunning &&
    !serverClockState.isPaused &&
    !serverClockState.isBetweenRounds
  ) {
    if (!warningPlayed && serverClockState.minutes === 0 && serverClockState.seconds === 10) {
      playLocalAudio(serverClockState.warningSoundPath);
      warningPlayed = true;
    }
    if (!endPlayed && serverClockState.minutes === 0 && serverClockState.seconds === 0) {
      playLocalAudio(serverClockState.endSoundPath);
      endPlayed = true;
    }
  }
}

function broadcastClients() {
  const clients = Array.from(connectedClients.values()).map(c => ({
    id: c.id,
    ip: c.ip,
    url: c.url,
    hostname: c.hostname,
    connectedAt: c.connectedAt
  }));
  broadcast({ type: 'clients', clients });
}

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

function queryWorldTime() {
  const url = 'https://worldtimeapi.org/api/ip';
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(new Date(json.utc_datetime).getTime());
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

function broadcast(data) {
  const message = JSON.stringify({
    ...data,
    ntpTimestamp: serverClockState.ntpSyncEnabled
      ? Date.now() + serverClockState.ntpOffset
      : null,
    serverTime: Date.now() + serverClockState.ntpOffset,
    ntpOffset: serverClockState.ntpOffset
  });
  console.log('Broadcasting to', wss.clients.size, 'clients:', data.type || data.action);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

async function performNtpSync() {
  const ntpServer = process.env.NTP_SERVER || 'time.google.com';
  try {
    const before = Date.now();
    let serverTime;
    try {
      serverTime = await queryNtpTime(ntpServer);
    } catch (err) {
      console.error('NTP sync failed:', err);
      serverTime = await queryWorldTime();
    }
    const after = Date.now();
    const networkDelay = (after - before) / 2;
    const clientTime = before + networkDelay;
    const offset = serverTime - clientTime;
    const diff = offset - serverClockState.ntpOffset;
    serverClockState.ntpOffset = offset;
    serverClockState.lastUpdateTime += diff;
    if (serverClockState.timeStamp !== null) {
      serverClockState.timeStamp += diff;
    }
    if (serverClockState.pauseStartTime) {
      serverClockState.pauseStartTime += diff;
    }
    if (serverClockState.endTime) {
      const end = new Date(serverClockState.endTime).getTime() + diff;
      serverClockState.endTime = new Date(end).toISOString();
    }
    broadcast({ type: 'status', ...serverClockState });
  } catch (err) {
    console.error('Scheduled time sync failed:', err);
  }
}

function startNtpSync() {
  if (ntpSyncTimer) {
    clearInterval(ntpSyncTimer);
  }
  if (!serverClockState.ntpSyncEnabled) return;
  performNtpSync();
  ntpSyncTimer = setInterval(performNtpSync, serverClockState.ntpSyncInterval);
}

function stopNtpSync() {
  if (ntpSyncTimer) {
    clearInterval(ntpSyncTimer);
    ntpSyncTimer = null;
  }
}

function startServerTimer() {
  if (serverTimer) {
    clearInterval(serverTimer);
  }
  
  console.log('Starting server timer');
  serverTimer = setInterval(() => {
    if (serverClockState.isRunning && !serverClockState.isPaused) {
      updateServerClock();
      checkAndPlayAudio();
      broadcast({
        type: 'status',
        ...serverClockState
      });
    }
    
    // Update pause duration if paused
    if (serverClockState.isPaused && serverClockState.pauseStartTime) {
      const pauseDuration = Math.floor(
        (Date.now() + serverClockState.ntpOffset - serverClockState.pauseStartTime) /
          1000
      );
      serverClockState.currentPauseDuration = pauseDuration;
      broadcast({
        type: 'status',
        ...serverClockState
      });
    }
  }, 1000);
}

function updateServerClock() {
  const now = Date.now() + serverClockState.ntpOffset;
  const elapsed = now - serverClockState.lastUpdateTime;
  if (elapsed < 1000) return;
  const ticks = Math.floor(elapsed / 1000);
  serverClockState.lastUpdateTime += ticks * 1000;

  for (let i = 0; i < ticks; i++) {
    if (serverClockState.isBetweenRounds) {
    // Count up during between rounds
    const newSeconds = serverClockState.betweenRoundsSeconds + 1;
    const newMinutes = newSeconds >= 60 ? serverClockState.betweenRoundsMinutes + 1 : serverClockState.betweenRoundsMinutes;
    const adjustedSeconds = newSeconds >= 60 ? 0 : newSeconds;

    const totalBetweenRoundsTime = serverClockState.betweenRoundsTime;
    const currentBetweenRoundsTime = newMinutes * 60 + adjustedSeconds;

    if (currentBetweenRoundsTime >= totalBetweenRoundsTime) {
      // Between rounds complete, advance to next round
      if (serverClockState.currentRound < serverClockState.totalRounds) {
        serverClockState.currentRound += 1;
        resetAudioFlags();
        serverClockState.minutes = serverClockState.initialTime.minutes;
        serverClockState.seconds = serverClockState.initialTime.seconds;
        serverClockState.startTime = { ...serverClockState.initialTime };
        serverClockState.isBetweenRounds = false;
        serverClockState.betweenRoundsMinutes = 0;
        serverClockState.betweenRoundsSeconds = 0;
        serverClockState.elapsedMinutes = 0;
        serverClockState.elapsedSeconds = 0;
        serverClockState.isRunning = false;
        serverClockState.isPaused = false;
        serverClockState.totalPausedTime = 0;
        serverClockState.currentPauseDuration = 0;
        serverClockState.pauseStartTime = null;
        serverClockState.timeStamp = now;
        serverClockState.endTime = new Date(
          serverClockState.timeStamp +
            (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
        ).toISOString();
        console.log('Between rounds complete, advanced to round', serverClockState.currentRound);
      } else {
        // All rounds complete
        serverClockState.isRunning = false;
        serverClockState.isBetweenRounds = false;
        serverClockState.timeStamp = now;
        serverClockState.endTime = new Date(serverClockState.timeStamp).toISOString();
        console.log('All rounds complete');
      }
    } else {
      serverClockState.betweenRoundsMinutes = newMinutes;
      serverClockState.betweenRoundsSeconds = adjustedSeconds;
      serverClockState.minutes = newMinutes;
      serverClockState.seconds = adjustedSeconds;
    }
  } else {
    // Regular countdown logic
    const newSeconds = serverClockState.seconds - 1;
    const newMinutes = newSeconds < 0 ? serverClockState.minutes - 1 : serverClockState.minutes;
    const adjustedSeconds = newSeconds < 0 ? 59 : newSeconds;

    const totalElapsed = (serverClockState.startTime.minutes * 60 + serverClockState.startTime.seconds) -
      (newMinutes * 60 + adjustedSeconds);
    const elapsedMinutes = Math.floor(totalElapsed / 60);
    const elapsedSeconds = totalElapsed % 60;

    const countdownFinished = newMinutes < 0 || (newMinutes === 0 && adjustedSeconds === 0);

    if (countdownFinished) {
      // Set final time before state transitions so audio can play
      serverClockState.minutes = 0;
      serverClockState.seconds = 0;
      checkAndPlayAudio();
      if (serverClockState.currentRound < serverClockState.totalRounds) {
        if (serverClockState.betweenRoundsEnabled) {
          // Start between rounds timer
          serverClockState.isBetweenRounds = true;
          serverClockState.betweenRoundsMinutes = 0;
          serverClockState.betweenRoundsSeconds = 0;
          serverClockState.elapsedMinutes = elapsedMinutes;
          serverClockState.elapsedSeconds = elapsedSeconds;
          serverClockState.timeStamp = now;
          serverClockState.endTime = new Date(
            serverClockState.timeStamp + serverClockState.betweenRoundsTime * 1000
          ).toISOString();
          console.log('Starting between rounds timer');
        } else {
          // Auto-advance to next round
          serverClockState.currentRound += 1;
          resetAudioFlags();
          serverClockState.minutes = serverClockState.initialTime.minutes;
          serverClockState.seconds = serverClockState.initialTime.seconds;
          serverClockState.startTime = { ...serverClockState.initialTime };
          serverClockState.elapsedMinutes = 0;
          serverClockState.elapsedSeconds = 0;
          serverClockState.timeStamp = now;
          serverClockState.endTime = new Date(
            serverClockState.timeStamp +
              (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
          ).toISOString();
          console.log('Auto-advanced to round', serverClockState.currentRound);
        }
      } else {
        // All rounds complete
        serverClockState.isRunning = false;
        serverClockState.minutes = 0;
        serverClockState.seconds = 0;
        serverClockState.elapsedMinutes = elapsedMinutes;
        serverClockState.elapsedSeconds = elapsedSeconds;
        serverClockState.timeStamp = now;
        serverClockState.endTime = new Date(serverClockState.timeStamp).toISOString();
        console.log('Timer completed - all rounds finished');
      }
  } else {
    serverClockState.minutes = newMinutes;
    serverClockState.seconds = adjustedSeconds;
    serverClockState.elapsedMinutes = elapsedMinutes;
    serverClockState.elapsedSeconds = elapsedSeconds;
  }
  }
}
}

wss.on('connection', ws => {
  const clientInfo = {
    id: Math.random().toString(36).slice(2),
    ip: normalizeIp(ws._socket.remoteAddress),
    url: '',
    hostname: '',
    connectedAt: Date.now() + serverClockState.ntpOffset
  };

  connectedClients.set(ws, clientInfo);
  // Send current server state to new connections
  ws.send(
    JSON.stringify({
      type: 'status',
      ...serverClockState
    })
  );
  broadcastClients();
  ws.send(
    JSON.stringify({
      type: 'clock_status_visitors',
      visitors: Array.from(clockStatusVisitors.entries()).map(([ip, ts]) => ({ ip, lastRequestTime: ts }))
    })
  );
  ws.send(JSON.stringify({ type: 'request-hostname' }));

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg.toString());
      console.log('WebSocket message received:', data.type);
      if (data.type === 'sync-settings') {
        // Sync settings from client (initial time, rounds, between rounds config)
        serverClockState.initialTime = data.initialTime || serverClockState.initialTime;
        serverClockState.totalRounds = data.totalRounds || serverClockState.totalRounds;
        if (typeof data.betweenRoundsEnabled === 'boolean') {
          serverClockState.betweenRoundsEnabled = data.betweenRoundsEnabled;
        }
        if (typeof data.betweenRoundsTime === 'number') {
          serverClockState.betweenRoundsTime = data.betweenRoundsTime;
        }
        if (typeof data.ntpSyncEnabled === 'boolean') {
          serverClockState.ntpSyncEnabled = data.ntpSyncEnabled;
          if (serverClockState.ntpSyncEnabled) {
            startNtpSync();
          } else {
            stopNtpSync();
          }
        }
        if (typeof data.ntpSyncInterval === 'number') {
          serverClockState.ntpSyncInterval = data.ntpSyncInterval;
        }
        if (typeof data.ntpDriftThreshold === 'number') {
          serverClockState.ntpDriftThreshold = data.ntpDriftThreshold;
        }
        if (
          typeof data.ntpSyncInterval === 'number' ||
          typeof data.ntpDriftThreshold === 'number'
        ) {
          startNtpSync();
        }
        if (data.url) {
          const info = connectedClients.get(ws);
          if (info) {
            info.url = data.url;
          }
        }
        broadcastClients();
        console.log('Settings synced from client');
      } else if (data.type === 'client-hostname') {
        const info = connectedClients.get(ws);
        if (info) {
          info.hostname = data.hostname || '';
          broadcastClients();
        }
      }
    } catch (err) {
      console.error('Invalid WS message', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    connectedClients.delete(ws);
    broadcastClients();
  });
});

// Start the server timer immediately
startServerTimer();

app.post('/api/start', (_req, res) => {
  console.log('API: Start timer');
  if (!serverClockState.isRunning) {
    serverClockState.startTime = {
      minutes: serverClockState.minutes,
      seconds: serverClockState.seconds
    };
  }
  if (serverClockState.isPaused && serverClockState.pauseStartTime) {
    serverClockState.totalPausedTime += Math.floor(
      (Date.now() + serverClockState.ntpOffset - serverClockState.pauseStartTime) /
        1000
    );
  }
  serverClockState.isRunning = true;
  serverClockState.isPaused = false;
  serverClockState.pauseStartTime = null;
  serverClockState.currentPauseDuration = 0;
  serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
  serverClockState.timeStamp = serverClockState.lastUpdateTime;
  const remainingSeconds = serverClockState.minutes * 60 + serverClockState.seconds;
  serverClockState.endTime = new Date(
    serverClockState.timeStamp + remainingSeconds * 1000
  ).toISOString();
  broadcast({ action: 'start' });
  res.json({ success: true });
});

app.post('/api/pause', (_req, res) => {
  console.log('API: Pause/Resume timer');
  if (serverClockState.isPaused) {
    // Resume
    if (serverClockState.pauseStartTime) {
      serverClockState.totalPausedTime += Math.floor(
        (Date.now() + serverClockState.ntpOffset - serverClockState.pauseStartTime) /
          1000
      );
    }
    serverClockState.isPaused = false;
    serverClockState.pauseStartTime = null;
    serverClockState.currentPauseDuration = 0;
    serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
    serverClockState.timeStamp = serverClockState.lastUpdateTime;
    const remain = serverClockState.minutes * 60 + serverClockState.seconds;
    serverClockState.endTime = new Date(serverClockState.timeStamp + remain * 1000).toISOString();
  } else {
    // Pause
    serverClockState.isPaused = true;
    serverClockState.pauseStartTime = Date.now() + serverClockState.ntpOffset;
    serverClockState.lastUpdateTime = serverClockState.pauseStartTime;
    serverClockState.timeStamp = serverClockState.lastUpdateTime;
  }
  broadcast({ action: 'pause' });
  res.json({ success: true });
});

app.post('/api/reset', (_req, res) => {
  console.log('API: Reset all');
  serverClockState.currentRound = 1;
  serverClockState.minutes = serverClockState.initialTime.minutes;
  serverClockState.seconds = serverClockState.initialTime.seconds;
  serverClockState.startTime = { ...serverClockState.initialTime };
  serverClockState.isRunning = false;
  serverClockState.isPaused = false;
  serverClockState.elapsedMinutes = 0;
  serverClockState.elapsedSeconds = 0;
  serverClockState.pauseStartTime = null;
  serverClockState.totalPausedTime = 0;
  serverClockState.currentPauseDuration = 0;
  serverClockState.isBetweenRounds = false;
  serverClockState.betweenRoundsMinutes = 0;
  serverClockState.betweenRoundsSeconds = 0;
  serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
  serverClockState.timeStamp = serverClockState.lastUpdateTime;
  serverClockState.endTime = new Date(
    serverClockState.timeStamp +
      (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
  ).toISOString();
  resetAudioFlags();
  broadcast({ action: 'reset' });
  broadcast({ type: 'status', ...serverClockState });
  res.json({ success: true });
});

app.post('/api/reset-time', (_req, res) => {
  console.log('API: Reset time only');
  serverClockState.minutes = serverClockState.initialTime.minutes;
  serverClockState.seconds = serverClockState.initialTime.seconds;
  serverClockState.startTime = { ...serverClockState.initialTime };
  serverClockState.isRunning = false;
  serverClockState.isPaused = false;
  serverClockState.elapsedMinutes = 0;
  serverClockState.elapsedSeconds = 0;
  serverClockState.pauseStartTime = null;
  serverClockState.totalPausedTime = 0;
  serverClockState.currentPauseDuration = 0;
  serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
  serverClockState.timeStamp = serverClockState.lastUpdateTime;
  serverClockState.endTime = new Date(
    serverClockState.timeStamp +
      (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
  ).toISOString();
  resetAudioFlags();
  broadcast({ action: 'reset-time' });
  broadcast({ type: 'status', ...serverClockState });
  res.json({ success: true });
});

app.post('/api/reset-rounds', (_req, res) => {
  console.log('API: Reset rounds');
  serverClockState.currentRound = 1;
  serverClockState.minutes = serverClockState.initialTime.minutes;
  serverClockState.seconds = serverClockState.initialTime.seconds;
  serverClockState.startTime = { ...serverClockState.initialTime };
  serverClockState.isRunning = false;
  serverClockState.isPaused = false;
  serverClockState.elapsedMinutes = 0;
  serverClockState.elapsedSeconds = 0;
  serverClockState.pauseStartTime = null;
  serverClockState.totalPausedTime = 0;
  serverClockState.currentPauseDuration = 0;
  serverClockState.isBetweenRounds = false;
  serverClockState.betweenRoundsMinutes = 0;
  serverClockState.betweenRoundsSeconds = 0;
  serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
  serverClockState.timeStamp = serverClockState.lastUpdateTime;
  serverClockState.endTime = new Date(
    serverClockState.timeStamp +
      (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
  ).toISOString();
  resetAudioFlags();
  broadcast({ action: 'reset-rounds' });
  broadcast({ type: 'status', ...serverClockState });
  res.json({ success: true });
});

app.post('/api/next-round', (_req, res) => {
  console.log('API: Next round');
  if (serverClockState.currentRound < serverClockState.totalRounds) {
    serverClockState.currentRound += 1;
    serverClockState.minutes = serverClockState.initialTime.minutes;
    serverClockState.seconds = serverClockState.initialTime.seconds;
    serverClockState.startTime = { ...serverClockState.initialTime };
    serverClockState.elapsedMinutes = 0;
    serverClockState.elapsedSeconds = 0;
    serverClockState.isRunning = false;
    serverClockState.isPaused = false;
    serverClockState.totalPausedTime = 0;
    serverClockState.currentPauseDuration = 0;
    serverClockState.pauseStartTime = null;
    serverClockState.isBetweenRounds = false;
    serverClockState.betweenRoundsMinutes = 0;
    serverClockState.betweenRoundsSeconds = 0;
    serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
    serverClockState.timeStamp = serverClockState.lastUpdateTime;
    serverClockState.endTime = new Date(
      serverClockState.timeStamp +
        (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
    ).toISOString();
    resetAudioFlags();
  }
  broadcast({ action: 'next-round' });
  broadcast({ type: 'status', ...serverClockState });
  res.json({ success: true });
});

app.post('/api/previous-round', (_req, res) => {
  console.log('API: Previous round');
  if (serverClockState.currentRound > 1) {
    serverClockState.currentRound -= 1;
    serverClockState.minutes = serverClockState.initialTime.minutes;
    serverClockState.seconds = serverClockState.initialTime.seconds;
    serverClockState.startTime = { ...serverClockState.initialTime };
    serverClockState.elapsedMinutes = 0;
    serverClockState.elapsedSeconds = 0;
    serverClockState.isRunning = false;
    serverClockState.isPaused = false;
    serverClockState.totalPausedTime = 0;
    serverClockState.currentPauseDuration = 0;
    serverClockState.pauseStartTime = null;
    serverClockState.isBetweenRounds = false;
    serverClockState.betweenRoundsMinutes = 0;
    serverClockState.betweenRoundsSeconds = 0;
    serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
    serverClockState.timeStamp = serverClockState.lastUpdateTime;
    serverClockState.endTime = new Date(
      serverClockState.timeStamp +
        (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
    ).toISOString();
    resetAudioFlags();
  }
  broadcast({ action: 'previous-round' });
  broadcast({ type: 'status', ...serverClockState });
  res.json({ success: true });
});

app.post('/api/adjust-time', (req, res) => {
  console.log('API: Adjust time by seconds');
  const { seconds } = req.body;
  if (typeof seconds === 'number' && (!serverClockState.isRunning || serverClockState.isPaused) && !serverClockState.isBetweenRounds) {
    const totalSeconds = serverClockState.minutes * 60 + serverClockState.seconds + seconds;
    const newMinutes = Math.floor(Math.max(0, totalSeconds) / 60);
    const newSeconds = Math.max(0, totalSeconds) % 60;
    
    serverClockState.minutes = newMinutes;
    serverClockState.seconds = newSeconds;
    if (!serverClockState.isRunning) {
      serverClockState.startTime = { minutes: newMinutes, seconds: newSeconds };
    }

    serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
    serverClockState.timeStamp = serverClockState.lastUpdateTime;
    serverClockState.endTime = new Date(
      serverClockState.timeStamp +
        (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
    ).toISOString();

    broadcast({ action: 'adjust-time', minutes: newMinutes, seconds: newSeconds });
    broadcast({ type: 'status', ...serverClockState });
  }
  res.json({ success: true });
});

app.post('/api/set-time', (req, res) => {
  console.log('API: Set time');
  const { minutes, seconds } = req.body;

  const newMinutes = typeof minutes === 'number' ? minutes : 5;
  const newSeconds = typeof seconds === 'number' ? seconds : 0;

  serverClockState.initialTime = { minutes: newMinutes, seconds: newSeconds };
  serverClockState.minutes = newMinutes;
  serverClockState.seconds = newSeconds;
  serverClockState.startTime = { minutes: serverClockState.minutes, seconds: serverClockState.seconds };
  serverClockState.elapsedMinutes = 0;
  serverClockState.elapsedSeconds = 0;
  serverClockState.isRunning = false;
  serverClockState.isPaused = false;
  serverClockState.totalPausedTime = 0;
  serverClockState.currentPauseDuration = 0;
  serverClockState.pauseStartTime = null;
  serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
  serverClockState.timeStamp = serverClockState.lastUpdateTime;
  serverClockState.endTime = new Date(
    serverClockState.timeStamp +
      (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
  ).toISOString();
  resetAudioFlags();
  broadcast({ action: 'set-time', minutes: newMinutes, seconds: newSeconds });
  // Immediately broadcast updated status so all clients reflect the change
  broadcast({ type: 'status', ...serverClockState });
  res.json({ success: true });
});

app.post('/api/set-rounds', (req, res) => {
  console.log('API: Set rounds');
  const { rounds } = req.body;
  serverClockState.totalRounds = rounds || 3;
  serverClockState.currentRound = 1;
  resetAudioFlags();
  broadcast({ action: 'set-rounds', rounds });
  res.json({ success: true });
});

app.post('/api/set-between-rounds', (req, res) => {
  console.log('API: Set between rounds settings');
  const { enabled, time } = req.body;
  if (typeof enabled === 'boolean') {
    serverClockState.betweenRoundsEnabled = enabled;
  }
  if (typeof time === 'number') {
    serverClockState.betweenRoundsTime = time;
  }
  res.json({ success: true });
});

app.post('/api/set-ntp-sync', (req, res) => {
  console.log('API: Set NTP sync settings');
  const { enabled, interval, driftThreshold } = req.body;
  if (typeof enabled === 'boolean') {
    serverClockState.ntpSyncEnabled = enabled;
  }
  if (typeof interval === 'number') {
    serverClockState.ntpSyncInterval = interval;
  }
  if (typeof driftThreshold === 'number') {
    serverClockState.ntpDriftThreshold = driftThreshold;
  }
  if (serverClockState.ntpSyncEnabled) {
    startNtpSync();
  } else {
    stopNtpSync();
  }
  res.json({ success: true });
});

app.post('/api/add-second', (_req, res) => {
  console.log('API: Add one second');
  if ((!serverClockState.isRunning || serverClockState.isPaused) && !serverClockState.isBetweenRounds) {
    const totalSeconds = serverClockState.minutes * 60 + serverClockState.seconds + 1;
    const newMinutes = Math.floor(totalSeconds / 60);
    const newSeconds = totalSeconds % 60;

    serverClockState.minutes = newMinutes;
    serverClockState.seconds = newSeconds;
    if (!serverClockState.isRunning) {
      serverClockState.startTime = { minutes: newMinutes, seconds: newSeconds };
    }
    serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
    serverClockState.timeStamp = serverClockState.lastUpdateTime;
    serverClockState.endTime = new Date(
      serverClockState.timeStamp +
        (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
    ).toISOString();

    broadcast({ action: 'add-second', minutes: newMinutes, seconds: newSeconds });
    broadcast({ type: 'status', ...serverClockState });
  }
  res.json({ success: true });
});

app.post('/api/remove-second', (_req, res) => {
  console.log('API: Remove one second');
  if ((!serverClockState.isRunning || serverClockState.isPaused) && !serverClockState.isBetweenRounds) {
    const totalSeconds = Math.max(0, serverClockState.minutes * 60 + serverClockState.seconds - 1);
    const newMinutes = Math.floor(totalSeconds / 60);
    const newSeconds = totalSeconds % 60;

    serverClockState.minutes = newMinutes;
    serverClockState.seconds = newSeconds;
    if (!serverClockState.isRunning) {
      serverClockState.startTime = { minutes: newMinutes, seconds: newSeconds };
    }
    serverClockState.lastUpdateTime = Date.now() + serverClockState.ntpOffset;
    serverClockState.timeStamp = serverClockState.lastUpdateTime;
    serverClockState.endTime = new Date(
      serverClockState.timeStamp +
        (serverClockState.minutes * 60 + serverClockState.seconds) * 1000
    ).toISOString();

    broadcast({ action: 'remove-second', minutes: newMinutes, seconds: newSeconds });
    broadcast({ type: 'status', ...serverClockState });
  }
  res.json({ success: true });
});

app.post('/api/upload-audio/:type', upload.single('audio'), (req, res) => {
  const { type } = req.params;
  if (!req.file || (type !== 'warning' && type !== 'end')) {
    return res.status(400).json({ error: 'Invalid audio upload' });
  }
  const url = `/uploads/${req.file.filename}`;
  if (type === 'warning') {
    serverClockState.warningSoundPath = url;
  } else {
    serverClockState.endSoundPath = url;
  }
  broadcast({ type: 'status', ...serverClockState });
  res.json({ success: true, path: url });
});

app.get('/api/audio', (_req, res) => {
  res.json({
    warningSoundPath: serverClockState.warningSoundPath,
    endSoundPath: serverClockState.endSoundPath
  });
});

app.get('/api/ntp-sync', async (req, res) => {
  if (req.query.server) {
    process.env.NTP_SERVER = String(req.query.server);
  }
  try {
    await performNtpSync();
    res.json({ offset: serverClockState.ntpOffset, lastSync: new Date().toISOString() });
  } catch (err) {
    console.error('Time sync failed:', err);
    res.status(500).json({ error: 'Time sync failed' });
  }
});

app.get('/api/status', (req, res) => {
  const { fields } = req.query;
  if (fields) {
    const requested = String(fields)
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);
    const filtered = {};
    requested.forEach(f => {
      if (Object.prototype.hasOwnProperty.call(serverClockState, f)) {
        filtered[f] = serverClockState[f];
      }
    });
    return res.json(filtered);
  }

  res.json({
    ...serverClockState,
    serverTime: Date.now() + serverClockState.ntpOffset,
    ntpOffset: serverClockState.ntpOffset,
    api_version: "1.0.0",
    connection_protocol: "http_rest_websocket"
  });
});

// Clock status endpoint for external integration - REMOVED broadcastClockStatusVisitors call
app.get('/clock_status', (req, res) => {
  const visitorIp = normalizeIp(req.ip);
  clockStatusVisitors.set(visitorIp, Date.now() + serverClockState.ntpOffset);
  // REMOVED: broadcastClockStatusVisitors(); // This was causing terminal spam

  const now = Date.now() + serverClockState.ntpOffset;
  let status = 0; // 0 = stopped, 1 = running, 2 = paused, 3 = between rounds
  let pauseTime = null;

  if (serverClockState.isBetweenRounds) {
    status = 3;
  } else if (serverClockState.isPaused) {
    status = 2;
    pauseTime = serverClockState.pauseStartTime
      ? new Date(serverClockState.pauseStartTime).toISOString()
      : new Date(now).toISOString();
  } else if (serverClockState.isRunning) {
    status = 1;
  } else {
    status = 0;
  }
  
  // Format clock time as M:SS
  const clockTime = serverClockState.isBetweenRounds ? 
    `${serverClockState.betweenRoundsMinutes}:${serverClockState.betweenRoundsSeconds.toString().padStart(2, '0')}` :
    `${serverClockState.minutes}:${serverClockState.seconds.toString().padStart(2, '0')}`;
  
  const response = {
    status,
    endTime: serverClockState.endTime,
    pauseTime,
    localIpAddress: getLocalIpAddress(),
    clockTime,
    timeStamp: new Date(serverClockState.timeStamp).toISOString()
  };
  
  res.json(response);
});

// Enhanced API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: "Tournament Clock API Documentation",
    version: "1.0.0",
    base_url: `http://${req.get('host')}`,
    connection_protocols: {
      http_rest: {
        description: "HTTP REST API for clock control and status",
        base_path: "/api"
      },
      websocket: {
        description: "Real-time WebSocket updates",
        endpoint: `ws://${req.get('host')}`,
        events: ["status", "action"]
      }
    },
    endpoints: {
      control: {
        "POST /api/start": "Start the countdown timer",
        "POST /api/pause": "Pause/Resume the timer",
        "POST /api/reset": "Reset timer to initial settings",
        "POST /api/reset-time": "Reset only the timer",
        "POST /api/reset-rounds": "Reset timer and round count",
        "POST /api/next-round": "Skip to next round",
        "POST /api/previous-round": "Go to previous round",
        "POST /api/adjust-time": {
          description: "Adjust time by seconds (only when stopped or paused)",
          body: { seconds: "number (positive or negative)" }
        }
      },
      configuration: {
        "POST /api/set-time": {
          description: "Set timer duration",
          body: { minutes: "number", seconds: "number" }
        },
        "POST /api/set-rounds": {
          description: "Set total rounds",
          body: { rounds: "number" }
        },
        "POST /api/set-between-rounds": {
          description: "Configure between rounds timer",
          body: { enabled: "boolean", time: "number (seconds)" }
        },
        "POST /api/set-ntp-sync": {
          description: "Configure NTP sync settings",
          body: { enabled: "boolean", interval: "number (seconds)", driftThreshold: "number (milliseconds)" }
        },
        "POST /api/upload-audio/{warning|end}": {
          description: "Upload audio alert files",
          body: { audio: "multipart/form-data" }
        }
      },
      status: {
        "GET /api/status": {
          description: "Get current timer state",
          query_params: {
            fields: "Comma-separated list of specific fields to return"
          },
          response_fields: {
            minutes: "Current minutes remaining",
            seconds: "Current seconds remaining",
            currentRound: "Current round number",
            totalRounds: "Total number of rounds",
            isRunning: "Whether timer is active",
            isPaused: "Whether timer is paused",
            elapsedMinutes: "Minutes elapsed in current round",
            elapsedSeconds: "Seconds elapsed in current round",
            isBetweenRounds: "Whether in between-rounds phase",
            betweenRoundsMinutes: "Between rounds timer minutes",
            betweenRoundsSeconds: "Between rounds timer seconds",
            betweenRoundsEnabled: "Between rounds timer enabled",
            betweenRoundsTime: "Between rounds timer duration (seconds)",
            totalPausedTime: "Total time paused (seconds)",
            currentPauseDuration: "Current pause duration (seconds)",
            serverTime: "Server timestamp",
            api_version: "API version",
            connection_protocol: "Supported protocols"
          }
        },
        "GET /api/audio": "Get current audio file URLs"
      },
      display: {
        "GET /clockpretty": "Beautiful dark dashboard display (read-only)",
        "GET /clockarena": "Compact arena-style countdown display"
      },
      documentation: {
        "GET /api/docs": "This API documentation"
      }
    },
    websocket_messages: {
      incoming: {
        "sync-settings": "Sync client settings to server"
      },
      outgoing: {
        status: "Real-time clock state updates",
        action: "Action confirmations"
      }
    },
    integration_examples: {
      bitfocus_companion: {
        module: "Generic HTTP",
        base_url: `http://${req.get('host')}`,
        examples: {
          start_button: "POST /api/start",
          pause_button: "POST /api/pause",
          reset_button: "POST /api/reset",
          status_feedback: "GET /api/status?fields=minutes,seconds,isRunning",
          adjust_time_up: "POST /api/adjust-time -d '{\"seconds\":1}'",
          adjust_time_down: "POST /api/adjust-time -d '{\"seconds\":-1}'"
        }
      },
      curl_examples: {
        start_timer: `curl -X POST http://${req.get('host')}/api/start`,
        get_status: `curl http://${req.get('host')}/api/status`,
        set_time: `curl -X POST http://${req.get('host')}/api/set-time -H "Content-Type: application/json" -d '{"minutes":5,"seconds":30}'`,
        adjust_time: `curl -X POST http://${req.get('host')}/api/adjust-time -H "Content-Type: application/json" -d '{"seconds":10}'`
      }
    }
  });
});

const dist = join(__dirname, 'dist');
app.use(express.static(dist));
app.get('*', (_req, res) => {
  res.sendFile(join(dist, 'index.html'));
});

const PORT = process.env.PORT || 4040;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
  console.log('Server-side clock initialized and running');
  broadcastClients();
  if (serverClockState.ntpSyncEnabled) {
    startNtpSync();
  }
});
