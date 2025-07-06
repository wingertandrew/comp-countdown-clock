import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const InfoTab: React.FC = () => (
  <div className="space-y-6 p-4 min-h-screen bg-gray-900 overflow-y-auto">
    <Card className="bg-gray-800 border-gray-600">
      <CardHeader>
        <CardTitle className="text-3xl text-white mb-4">Clock Behavior Guide</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-gray-300 text-lg">
        <section>
          <h3 className="text-2xl text-white font-bold mb-2">Core Concepts</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Server-Side Clock</strong> – The timer is maintained on the server. All connected clients display the same countdown.</li>
            <li><strong>Rounds</strong> – You can configure one or more rounds. Each round uses the same starting time.</li>
            <li><strong>Between Rounds</strong> – Optional countdown that runs between rounds. When enabled, a short timer counts up between rounds before the next round begins.</li>
            <li><strong>NTP Synchronization</strong> – If enabled, the server periodically syncs with an NTP time source for accurate timing.</li>
          </ul>
        </section>
        <section>
          <h3 className="text-2xl text-white font-bold mb-2">Timer States</h3>
          <p>The clock keeps track of several pieces of state:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><code>minutes</code> and <code>seconds</code> – Current time remaining in the round.</li>
            <li><code>currentRound</code> / <code>totalRounds</code> – Progress through the configured rounds.</li>
            <li><code>isRunning</code> – Timer is actively counting down.</li>
            <li><code>isPaused</code> – Timer is paused but will resume from the same time.</li>
            <li><code>elapsedMinutes</code> / <code>elapsedSeconds</code> – Time elapsed in the current round.</li>
            <li><code>totalPausedTime</code> – Sum of all pause durations.</li>
            <li><code>isBetweenRounds</code> – Indicates the between-rounds timer is running.</li>
          </ul>
          <p>All state changes are broadcast to every connected display via WebSocket so that all clients stay in sync.</p>
        </section>
        <section>
          <h3 className="text-2xl text-white font-bold mb-2">Primary Controls</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Start</strong> – Begin or resume the countdown. When starting the very first time, the server records the starting minutes and seconds.</li>
            <li><strong>Pause/Resume</strong> – Toggle the paused state. While paused, the clock does not advance.</li>
            <li><strong>Reset Time</strong> – Return the timer to the original minutes and seconds for the current round but keep the round number.</li>
            <li><strong>Reset Rounds</strong> – Return to round 1 and restore the starting time. This is equivalent to a full reset of the match.</li>
            <li><strong>Next Round</strong> – Immediately advance to the next round. The timer resets to the initial time for that round.</li>
            <li><strong>Previous Round</strong> – Move back one round and reset the timer to the starting time.</li>
            <li><strong>Adjust Time</strong> – While stopped or paused, officials may add or subtract seconds from the timer.</li>
          </ul>
        </section>
        <section>
          <h3 className="text-2xl text-white font-bold mb-2">Between Rounds Behavior</h3>
          <p>If the between-rounds option is enabled:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>When a round ends, the clock enters the <strong>between rounds</strong> state and starts counting up from zero.</li>
            <li>The between-rounds timer continues until it reaches the configured duration.</li>
            <li>Once complete, the clock automatically advances to the next round and resets the countdown timer.</li>
            <li>Officials may cancel the between-rounds period early by starting the next round manually.</li>
          </ol>
          <p className="mt-2">During the between-rounds state, the main countdown controls are disabled to prevent accidental changes.</p>
        </section>
        <section>
          <h3 className="text-2xl text-white font-bold mb-2">NTP Time Sync</h3>
          <p>For precise timing over long events, the server can sync with Network Time Protocol (NTP) servers. When enabled, the server periodically checks the reference time and applies a small offset to keep the clock accurate. The current offset and sync health are visible in the debug tab.</p>
        </section>
        <section>
          <h3 className="text-2xl text-white font-bold mb-2">Display Pages</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><code>/clockpretty</code> – Fullscreen dark display suitable for broadcast or large screens.</li>
            <li><code>/clockarena</code> – Compact overlay showing the same timer information.</li>
          </ul>
          <p className="mt-2">Both displays are read-only and update automatically from the server.</p>
        </section>
        <section>
          <h3 className="text-2xl text-white font-bold mb-2">Usage Tips for Officials</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Use the <strong>Reset Time</strong> button if you need to restart a round without clearing the round count.</li>
            <li>Use <strong>Reset Rounds</strong> before a new match or if you must completely restart.</li>
            <li>The clock continues running even if you close the web browser, provided the server is still running.</li>
            <li>All control actions have corresponding HTTP API endpoints, allowing integration with devices like the Stream Deck.</li>
          </ul>
          <p className="mt-2">For more technical details or integration examples, consult <code>README.md</code> and the API documentation available at <code>/api/docs</code> when the server is running.</p>
        </section>
      </CardContent>
    </Card>
  </div>
);

export default InfoTab;
