# Countdown Clock Behavior Guide

This document outlines how the Round Ready Countdown Clock operates. It is intended for event judges and officials who need a concise understanding of the clock's behavior and controls.

## Core Concepts

- **Server‑Side Clock** – The timer is maintained on the server. All connected clients display the same countdown.
- **Rounds** – You can configure one or more rounds. Each round uses the same starting time.
- **Between Rounds** – Optional countdown that runs between rounds. When enabled, a short timer counts up between rounds before the next round begins.
- **NTP Synchronization** – If enabled, the server periodically syncs with an NTP time source for accurate timing.

## Timer States

The clock keeps track of several pieces of state:

- `minutes` and `seconds` – Current time remaining in the round.
- `currentRound` / `totalRounds` – Progress through the configured rounds.
- `isRunning` – Timer is actively counting down.
- `isPaused` – Timer is paused but will resume from the same time.
- `elapsedMinutes` / `elapsedSeconds` – Time elapsed in the current round.
- `totalPausedTime` – Sum of all pause durations.
- `isBetweenRounds` – Indicates the between‑rounds timer is running.

All state changes are broadcast to every connected display via WebSocket so that all clients stay in sync.

## Primary Controls

- **Start** – Begin or resume the countdown. When starting the very first time, the server records the starting minutes and seconds.
- **Pause/Resume** – Toggle the paused state. While paused, the clock does not advance.
- **Reset Time** – Return the timer to the original minutes and seconds for the current round but keep the round number.
- **Reset Rounds** – Return to round 1 and restore the starting time. This is equivalent to a full reset of the match.
- **Next Round** – Immediately advance to the next round. The timer resets to the initial time for that round.
- **Previous Round** – Move back one round and reset the timer to the starting time.
- **Adjust Time** – While stopped or paused, officials may add or subtract seconds from the timer.

## Between Rounds Behavior

If the between‑rounds option is enabled:

1. When a round ends, the clock enters the **between rounds** state and starts counting up from zero.
2. The between‑rounds timer continues until it reaches the configured duration.
3. Once complete, the clock automatically advances to the next round and resets the countdown timer.
4. Officials may cancel the between‑rounds period early by starting the next round manually.

During the between‑rounds state, the main countdown controls are disabled to prevent accidental changes.

## NTP Time Sync

For precise timing over long events, the server can sync with Network Time Protocol (NTP) servers. When enabled, the server periodically checks the reference time and applies a small offset to keep the clock accurate. The current offset and sync health are visible in the debug tab.

## Display Pages

- `/clockpretty` – Fullscreen dark display suitable for broadcast or large screens.
- `/clockarena` – Compact overlay showing the same timer information.

Both displays are read‑only and update automatically from the server.

## Usage Tips for Officials

- Use the **Reset Time** button if you need to restart a round without clearing the round count.
- Use **Reset Rounds** before a new match or if you must completely restart.
- The clock continues running even if you close the web browser, provided the server is still running.
- All control actions have corresponding HTTP API endpoints, allowing integration with devices like the Stream Deck.

For more technical details or integration examples, consult `README.md` and the API documentation available at `/api/docs` when the server is running.
