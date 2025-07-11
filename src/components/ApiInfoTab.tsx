import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { copyCommand } from '@/utils/clockUtils';

interface ApiInfoTabProps {
  ipAddress: string;
  onCommandCopy: (command: string) => void;
}

const ApiInfoTab: React.FC<ApiInfoTabProps> = ({ ipAddress, onCommandCopy }) => {
  const handleCopyCommand = async (endpoint: string) => {
    await copyCommand(endpoint, onCommandCopy);
  };

  return (
    <div className="space-y-6 p-4 min-h-screen bg-gray-900">
      <Card className="bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-3xl text-white mb-4">HTTP API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-xl text-gray-300 bg-gray-700 p-6 rounded-xl">
            <div className="text-2xl font-bold text-white mb-4">Server accessible at:</div>
            <ul className="list-disc list-inside mt-4 space-y-3">
              <li>
                <code className="bg-gray-900 px-4 py-2 rounded text-lg text-green-400">
                  http://{ipAddress}:{window.location.port || 4040}
                </code>
              </li>
              {ipAddress !== 'localhost' && (
                <li>
                  <code className="bg-gray-900 px-4 py-2 rounded text-lg text-green-400">
                    http://localhost:{window.location.port || 4040}
                  </code>
                </li>
              )}
            </ul>
          </div>


          <div className="bg-purple-900 p-6 rounded-xl">
            <h3 className="text-2xl font-bold text-purple-300 mb-4">📋 Complete API Documentation</h3>
            <div className="space-y-3">
              <a 
                href="/api/docs" 
                target="_blank" 
                className="block bg-purple-800 hover:bg-purple-700 p-4 rounded-lg transition-colors"
              >
                <code className="text-xl text-purple-200 font-bold">GET /api/docs</code>
                <p className="text-gray-300 mt-2">Complete API documentation with examples, WebSocket protocol, and integration guides</p>
              </a>
              <a 
                href="/api/status" 
                target="_blank" 
                className="block bg-purple-800 hover:bg-purple-700 p-4 rounded-lg transition-colors"
              >
                <code className="text-xl text-purple-200 font-bold">GET /api/status</code>
                <p className="text-gray-300 mt-2">Live server-side clock status (JSON format)</p>
              </a>
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-green-400 mb-6">Timer Controls</h3>
              <div className="space-y-4 text-lg">
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-green-300 font-bold">POST /start</code>
                    <p className="text-gray-300 mt-2 text-lg">Start the countdown timer</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/start')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-yellow-300 font-bold">POST /pause</code>
                    <p className="text-gray-300 mt-2 text-lg">Pause/Resume the timer</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/pause')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-red-300 font-bold">POST /reset</code>
                    <p className="text-gray-300 mt-2 text-lg">Reset timer to initial settings</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/reset')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-red-300 font-bold">POST /reset-time</code>
                    <p className="text-gray-300 mt-2 text-lg">Reset only the timer</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/reset-time')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-red-300 font-bold">POST /reset-rounds</code>
                    <p className="text-gray-300 mt-2 text-lg">Reset timer and round count</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/reset-rounds')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-blue-300 font-bold">POST /next-round</code>
                    <p className="text-gray-300 mt-2 text-lg">Skip to next round</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/next-round')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-purple-300 font-bold">POST /previous-round</code>
                    <p className="text-gray-300 mt-2 text-lg">Go to previous round</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/previous-round')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-cyan-300 font-bold">POST /add-second</code>
                    <p className="text-gray-300 mt-2 text-lg">Add one second to timer (when stopped/paused)</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/add-second')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl flex justify-between items-center">
                  <div>
                    <code className="text-2xl text-cyan-300 font-bold">POST /remove-second</code>
                    <p className="text-gray-300 mt-2 text-lg">Remove one second from timer (when stopped/paused)</p>
                  </div>
                  <Button variant="ghost" size="lg" onClick={() => handleCopyCommand('/remove-second')} className="h-16 w-16">
                    <Copy className="w-8 h-8 text-white" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-blue-400 mb-6">Configuration</h3>
              <div className="space-y-4 text-lg">
                <div className="bg-gray-700 p-6 rounded-xl">
                  <code className="text-2xl text-purple-300 font-bold">POST /set-time</code>
                  <p className="text-gray-300 mt-2">Body: <code className="bg-gray-900 px-2 py-1 rounded">{"{"}"minutes": 5, "seconds": 30{"}"}</code></p>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl">
                  <code className="text-2xl text-purple-300 font-bold">POST /set-rounds</code>
                  <p className="text-gray-300 mt-2">Body: <code className="bg-gray-900 px-2 py-1 rounded">{"{"}"rounds": 10{"}"}</code></p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-cyan-400 mb-6">Status & Display Pages</h3>
              <div className="space-y-4 text-lg">
                <div className="bg-gray-700 p-6 rounded-xl">
                  <code className="text-2xl text-cyan-300 font-bold">GET /status</code>
                  <p className="text-gray-300 mt-2">Get current timer state and settings</p>
                  <p className="text-gray-400 text-sm mt-1">Use <code className="bg-gray-900 px-1 py-0.5 rounded">?fields=minutes,seconds</code> to request specific values</p>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl">
                  <a href="/clockpretty" target="_blank" className="text-2xl text-cyan-300 underline font-bold">
                    <code>GET /clockpretty</code>
                  </a>
                  <p className="text-gray-300 mt-2">Beautiful dark dashboard display (read-only)</p>
                </div>
                <div className="bg-gray-700 p-6 rounded-xl">
                  <a href="/clockarena" target="_blank" className="text-2xl text-cyan-300 underline font-bold">
                    <code>GET /clockarena</code>
                  </a>
                  <p className="text-gray-300 mt-2">Compact arena-style countdown display</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-orange-400 mb-6">🔌 Integration Protocols</h3>
              <div className="bg-gray-700 p-6 rounded-xl text-lg space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-white mb-3">HTTP REST API</h4>
                  <p className="text-gray-300 mb-2">Standard HTTP requests for control and status</p>
                  <code className="bg-gray-900 px-2 py-1 rounded">Base URL: http://{ipAddress}:{window.location.port || 4040}/api</code>
                </div>
                
                <div>
                  <h4 className="text-xl font-bold text-white mb-3">WebSocket Real-time</h4>
                  <p className="text-gray-300 mb-2">Live updates and bidirectional communication</p>
                  <code className="bg-gray-900 px-2 py-1 rounded">WS URL: ws://{ipAddress}:{window.location.port || 4040}/ws</code>
                </div>

                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-xl font-bold text-white mb-3">External Application Integration</h4>
                  <div className="space-y-2 text-gray-300">
                    <div><strong>Bitfocus Companion:</strong> Use "Generic HTTP" module</div>
                    <div><strong>OBS Studio:</strong> Use Browser Source with /clockpretty or /clockarena</div>
                    <div><strong>Custom Apps:</strong> Poll /api/status for live data</div>
                    <div><strong>Stream Deck:</strong> HTTP requests to control endpoints</div>
                    <div><strong>Home Assistant:</strong> REST sensor integration</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
          <h3 className="text-2xl font-bold text-orange-400 mb-6">Bitfocus Companion Integration</h3>
          <div className="bg-gray-700 p-6 rounded-xl text-lg">
                <p className="text-gray-300 mb-4 text-xl">For Bitfocus Companion with Stream Deck:</p>
                <ul className="list-disc list-inside space-y-3 text-gray-300">
                  <li className="text-lg">Use "Generic HTTP" module in Companion</li>
                  <li className="text-lg">Set target IP to your Pi's address: <code className="bg-gray-900 px-2 py-1 rounded">{ipAddress}</code></li>
                  <li className="text-lg">Use port: <code className="bg-gray-900 px-2 py-1 rounded">{window.location.port || 4040}</code></li>
                  <li className="text-lg">Set method to POST for timer controls</li>
                  <li className="text-lg">Use GET for status checks and feedback</li>
                </ul>
                
                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-xl font-bold text-white mb-3">Example Companion Setup:</h4>
                  <div className="space-y-2 text-gray-300">
                    <div><strong>Base URL:</strong> <code className="bg-gray-900 px-2 py-1 rounded">http://{ipAddress}:{window.location.port || 4040}</code></div>
                    <div><strong>Start Button:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/start</code></div>
                    <div><strong>Pause Button:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/pause</code></div>
                    <div><strong>Reset All:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/reset</code></div>
                    <div><strong>Reset Time:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/reset-time</code></div>
                    <div><strong>Reset Rounds:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/reset-rounds</code></div>
                    <div><strong>Add Second:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/add-second</code></div>
                    <div><strong>Remove Second:</strong> <code className="bg-gray-900 px-2 py-1 rounded">POST /api/remove-second</code></div>
                  </div>
                </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-orange-400 mb-6">Connection Instructions</h3>
            <div className="bg-gray-700 p-6 rounded-xl text-lg space-y-4">
              <p>
                The <code className="bg-gray-900 px-2 py-1 rounded">/clock_status</code>
                {' '}endpoint provides a lightweight snapshot of the timer for integrations
                that don't require the full{' '}
                <code className="bg-gray-900 px-2 py-1 rounded">/api/status</code>{' '}response.
                Each request is logged and recent callers are broadcast to WebSocket
                clients as a <code className="bg-gray-900 px-2 py-1 rounded">clock_status_visitors</code>
                {' '}message.
              </p>
              <div>
                <h4 className="font-bold text-white mb-2">Endpoint</h4>
                <code className="bg-gray-900 px-2 py-1 rounded">GET /clock_status</code>
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">Example Request</h4>
                <code className="bg-gray-900 px-2 py-1 rounded">curl http://{ipAddress}:{window.location.port || 4040}/clock_status</code>
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">Example Response</h4>
                <pre className="bg-gray-900 p-2 rounded text-sm overflow-x-auto">
{`{
  "status": 1,
  "endTime": "2024-05-29T12:34:56.789Z",
  "pauseTime": null,
  "localIpAddress": "192.168.1.10",
  "clockTime": "02:15",
  "timeStamp": "2024-05-29T12:32:41.000Z"
}`}
                </pre>
              </div>
              <p>
                Connect to the WebSocket at{' '}
                <code className="bg-gray-900 px-2 py-1 rounded">ws://{ipAddress}:{window.location.port || 4040}/ws</code>
                {' '}to receive <code className="bg-gray-900 px-2 py-1 rounded">status</code>{' '}
                and{' '}
                <code className="bg-gray-900 px-2 py-1 rounded">clock_status_visitors</code>{' '}
                updates in real time.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  );
};

export default ApiInfoTab;
