# Clock Status API & Connection Guide

The `/clock_status` endpoint offers a lightweight way for external systems to check the current timer state from the Round Ready Countdown Clock.

## Endpoint

`GET /clock_status`

- **Purpose**: Provide a simple status snapshot for integrations that do not need the full `/api/status` response.
- **Logging**: Each request records the caller's IP and timestamp. The visitor list is later broadcast to WebSocket clients as a `clock_status_visitors` message.

### Response Fields

| Field            | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `status`         | Timer state (0 = stopped, 1 = running, 2 = paused, 3 = between rounds) |
| `endTime`        | ISO timestamp when the current phase ends                            |
| `pauseTime`      | ISO timestamp when pause began (`null` if not paused)                |
| `localIpAddress` | Server's local network IP address                                    |
| `clockTime`      | Human readable timer display (e.g. `2:30`)                           |
| `timeStamp`      | Time of the response on the server                                   |

Example request:

```bash
curl http://<host>:4040/clock_status
```

Example response:

```json
{
  "status": 1,
  "endTime": "2024-05-29T12:34:56.789Z",
  "pauseTime": null,
  "localIpAddress": "192.168.1.10",
  "clockTime": "02:15",
  "timeStamp": "2024-05-29T12:32:41.000Z"
}
```

The status values and response structure come directly from the server implementation:

```javascript
app.get('/clock_status', (req, res) => {
  const visitorIp = normalizeIp(req.ip);
  clockStatusVisitors.set(visitorIp, Date.now() + serverClockState.ntpOffset);
  // ...determine status and endTime...
  const response = {
    status,
    endTime,
    pauseTime,
    localIpAddress: getLocalIpAddress(),
    clockTime,
    timeStamp: new Date(now).toISOString()
  };
  res.json(response);
});
```

## WebSocket Updates

Clients may connect to `ws://<host>:4040/ws` to receive real-time updates. Upon connection the server sends:

- A `status` message containing the full timer state.
- A `clock_status_visitors` message with an array of recent `/clock_status` callers.

These messages are sent automatically as shown in the connection handler:

```javascript
wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'status', ...serverClockState }));
  ws.send(JSON.stringify({
    type: 'clock_status_visitors',
    visitors: Array.from(clockStatusVisitors.entries()).map(([ip, ts]) => ({ ip, lastRequestTime: ts }))
  }));
});
```

Use the WebSocket feed to keep displays or control surfaces in sync without polling the HTTP endpoint.

