
# Round Ready Countdown Clock

A touch-friendly countdown clock application. Originally built for Raspberry Pi, it also runs well on macOS for local development and testing. The app includes external API control support for Stream Deck and other devices.

## Features

- **Large, Touch-Friendly Interface**: Optimized for touchscreen displays
- **Multi-Round Support**: Configure 1-15 rounds with automatic progression
- **External Control**: HTTP API for Stream Deck and other external devices
- **Real-Time Updates**: WebSocket support for live status updates
- **Responsive Design**: Works on various screen sizes
- **Visual Feedback**: Toast notifications and clear status indicators

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

The application will be available at `http://localhost:8080`

### Development on macOS
1. Install Node.js via [Homebrew](https://brew.sh/) with `brew install node` or download it from the official website.
2. The "UFC Sans" typeface is loaded automatically. You can also install it system wide if desired.
3. Run the steps in **Quick Start** above. The Vite dev server works the same on macOS.

## Usage

### Touch Interface
1. **Clock Tab**: Main countdown display with large timer and controls
2. **Settings Tab**: Configure timer duration and number of rounds
3. **API Info Tab**: Complete documentation for external control

### Controls
- **Start**: Begin countdown
- **Pause/Resume**: Pause or resume timer
- **Reset**: Reset to initial settings
- **Next Round**: Skip to next round

## HTTP API Reference

Base URL: `http://<device-ip>:8080/api` (use `localhost` when developing on macOS)

### Timer Controls
```bash
# Start timer
curl -X POST http://localhost:8080/api/start

# Pause/Resume timer
curl -X POST http://localhost:8080/api/pause

# Reset timer
curl -X POST http://localhost:8080/api/reset

# Next round
curl -X POST http://localhost:8080/api/next-round
```

### Configuration
```bash
# Set timer duration
curl -X POST http://localhost:8080/api/set-time \
  -H "Content-Type: application/json" \
  -d '{"minutes": 5, "seconds": 30}'

# Set number of rounds
curl -X POST http://localhost:8080/api/set-rounds \
  -H "Content-Type: application/json" \
  -d '{"rounds": 10}'
```

### Status
```bash
# Get current status
curl http://localhost:8080/api/status
```

## Stream Deck Integration

### Using Companion
1. Add HTTP Request actions in Companion
2. Configure your device's IP address (use `localhost` during development)
3. Use the API endpoints listed above
4. Set appropriate HTTP methods (POST for controls, GET for status)
5. Set the port to `8080` unless you changed it in `server.js`
6. Test each button in Companion's emulator before deploying

For best results create separate buttons for `start`, `pause`, `reset` and `next-round`.  Companion sends the HTTP calls directly to the application and the connected clients stay in sync through WebSocket.

You can also use Companion's HTTP feedback feature to poll `/api/status` and display the remaining time or current round on your Stream Deck keys.

### Example Stream Deck Layout
- Button 1: Start Timer (POST /api/start)
- Button 2: Pause Timer (POST /api/pause)
- Button 3: Reset Timer (POST /api/reset)
- Button 4: Next Round (POST /api/next-round)

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
