
# Round Ready Countdown Clock

A touch-friendly countdown clock application. Originally built for Raspberry Pi, it also runs well on macOS for local development and testing. The app includes external API control support for Stream Deck and other devices.

## Features

- **Large, Touch-Friendly Interface** – Optimized for touchscreen displays
- **Multi‑Round Timer** – Configure 1‑15 rounds with an optional between‑rounds clock
- **Server‑Side Clock** – Countdown continues even if your browser is closed
- **External Control API** – HTTP endpoints for start, pause, reset and more
- **WebSocket Updates** – All connected clients stay perfectly in sync
- **Display Pages** – Read‑only layouts at `/clockpretty` and `/clockarena`
- **Debug Logging** – Built‑in log viewer with CSV export
- **Network Time Sync** – Sync with an NTP server for accurate timing
- **Responsive Design & Toasts** – Works on any screen with clear feedback

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- macOS or Raspberry Pi with Raspbian OS
- Touch screen display (recommended on Raspberry Pi)

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd countdown-clock-app
npm install
npm run dev
```

The application will be available at `http://localhost:4040`

### Development on macOS
1. Install Node.js via [Homebrew](https://brew.sh/) with `brew install node` or download it from the official website.
2. The "UFC Sans" typeface is loaded automatically. You can also install it system wide if desired.
3. Run the steps in **Quick Start** above. The Vite dev server works the same on macOS.

## Usage

### Touch Interface
1. **Clock Tab**: Main countdown display with large timer and controls
2. **Settings Tab**: Configure timer, rounds and between-rounds options
3. **API Info Tab**: Copy-ready HTTP commands and docs
4. **Debug Tab**: Inspect log entries and export CSV

### Additional Displays
- `GET /clockpretty` – Large dark mode display for broadcasting
- `GET /clockarena` – Compact arena-style overlay

### Controls
- **Start**: Begin countdown
- **Pause/Resume**: Pause or resume timer
- **Reset Time**: Reset only the timer
- **Reset Rounds**: Reset timer and round counter
- **Next Round**: Skip to next round
- **Previous Round**: Go back one round

## HTTP API Reference

Base URL: `http://<device-ip>:4040/api` (use `localhost` when developing on macOS)

### Timer Controls
```bash
# Start timer
curl -X POST http://localhost:4040/api/start

# Pause/Resume timer
curl -X POST http://localhost:4040/api/pause

# Reset timer
curl -X POST http://localhost:4040/api/reset

# Reset only the timer
curl -X POST http://localhost:4040/api/reset-time

# Reset timer and round count
curl -X POST http://localhost:4040/api/reset-rounds

# Next round
curl -X POST http://localhost:4040/api/next-round

# Previous round
curl -X POST http://localhost:4040/api/previous-round
```

All of the above control endpoints immediately broadcast the updated timer
`status` to any connected WebSocket clients so displays stay in sync.

### Configuration
```bash
# Set timer duration
curl -X POST http://localhost:4040/api/set-time \
  -H "Content-Type: application/json" \
  -d '{"minutes": 5, "seconds": 30}'

# Set number of rounds
curl -X POST http://localhost:4040/api/set-rounds \
  -H "Content-Type: application/json" \
  -d '{"rounds": 10}'

# Set between-rounds timer
curl -X POST http://localhost:4040/api/set-between-rounds \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "time": 60}'
```

### Status
```bash
# Get current status
curl http://localhost:4040/api/status
```

### NTP Sync
```bash
# Sync time using the default server (time.google.com)
curl http://localhost:4040/api/ntp-sync
```

If the UDP request to the NTP server fails (for example when port 123 is
blocked), the server automatically falls back to
`https://worldtimeapi.org/api/ip` to retrieve the current time via HTTPS.

### API Docs
```bash
# Open interactive documentation
curl http://localhost:4040/api/docs

## Stream Deck Integration

Bitfocus Companion is free control software for the Elgato Stream Deck. Use it to trigger the HTTP API from your Stream Deck or any network-connected device.

### Using Companion

1. Install [Bitfocus Companion](https://bitfocus.io/companion) and open the web interface.
2. In the **Connections** tab add the **HTTP Request** module.
3. Create a button and add an **HTTP Request** action.
4. Enter a URL like `http://localhost:4040/api/start` (replace `start` with the desired command).
5. Set the method to `POST` for controls or `GET` for `/api/status`.
6. Use `localhost` when developing or the clock's IP address on your network.
7. Keep the port `4040` unless you changed it in `server.js`.
8. Test each button in Companion's emulator before deploying.

For best results, create separate buttons for `start`, `pause`, `reset-rounds`, `next-round` and `previous-round`. Companion sends the HTTP calls directly to the application, and connected clients stay in sync through WebSocket.

You can also add an HTTP Feedback in Companion to poll `http://localhost:4040/api/status` every second and show the current `minutes`, `seconds`, or `round` fields directly on your Stream Deck keys. Combine feedback variables with button styles to change text or colors as the timer updates.


### Example Stream Deck Layout
- Button 1: Start Timer (POST /api/start)
- Button 2: Pause Timer (POST /api/pause)
- Button 3: Reset Rounds (POST /api/reset-rounds)
- Button 4: Next Round (POST /api/next-round)
- Button 5: Previous Round (POST /api/previous-round)

## Technical Implementation

### Backend API Server (Required for Production)
The repository now includes a small Express based server in `server.js` that
handles the HTTP API and WebSocket communication. After building the client
with `npm run build`, start the server with:

```bash
npm start
```

The server serves the contents of the `dist` directory and keeps all connected
WebSocket clients in sync. API endpoints such as `/api/start`, `/api/pause` and
others broadcast commands to every client and the clients report their status
back to the server so other pages remain updated.

### WebSocket Integration
The application supports real-time communication via WebSocket:
- Server sends commands to connected clients
- Clients broadcast status updates
- Enables synchronization across multiple displays

## Customization

### Display Settings
- Modify timer font size in `CountdownClock.tsx`
- Adjust color schemes in the component styles
- Configure touch target sizes for different screen sizes

### API Extensions
- Add authentication for security
- Implement preset timer configurations
- Add logging and analytics

## Troubleshooting

### Common Issues
1. **API not responding**: Ensure backend server is running
2. **Touch not working**: Check display calibration
3. **WebSocket errors**: Verify network connectivity

### Performance Optimization
- Use hardware acceleration on Raspberry Pi
- Optimize React rendering for smoother animations
- Configure appropriate display resolution

## License

MIT License - see LICENSE file for details
