
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionReport, RoundStats } from '@/types/clock';
import { Download, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface SessionReportProps {
  report: SessionReport;
  onExport: (format: 'pdf' | 'csv' | 'json') => void;
  onClose: () => void;
}

const SessionReportComponent: React.FC<SessionReportProps> = ({ report, onExport, onClose }) => {
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getSegmentColor = (type: string): string => {
    switch (type) {
      case 'run': return '#10b981'; // green
      case 'pause': return '#f59e0b'; // yellow
      case 'between-rounds': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  const renderTimelineBar = (round: RoundStats) => {
    const totalTime = round.totalTime;
    if (totalTime === 0) return null;

    return (
      <div className="w-full h-8 bg-gray-700 rounded-lg overflow-hidden flex">
        {round.segments
          .sort((a, b) => a.startTime - b.startTime)
          .map((segment, index) => {
            const widthPercent = (segment.duration / totalTime) * 100;
            return (
              <div
                key={index}
                className="h-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: getSegmentColor(segment.type),
                  minWidth: widthPercent > 5 ? 'auto' : '2px'
                }}
                title={`${segment.type}: ${formatDuration(segment.duration)}`}
              >
                {widthPercent > 10 && formatDuration(segment.duration)}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="bg-gray-900 border-gray-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl text-white flex items-center gap-3">
                <Clock className="w-8 h-8" />
                Session Report Card
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => onExport('json')} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                <Button onClick={() => onExport('csv')} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={onClose} size="sm" variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {formatDuration(report.totalActualTime)}
                    </div>
                    <div className="text-sm text-gray-300">Total Session Time</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {formatDuration(report.totalPauseTime)}
                    </div>
                    <div className="text-sm text-gray-300">Total Pause Time</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {formatDuration(report.totalBetweenTime)}
                    </div>
                    <div className="text-sm text-gray-300">Between Rounds</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {Math.round(((report.totalActualTime - report.totalPauseTime - report.totalBetweenTime) / report.totalExpectedTime) * 100)}%
                    </div>
                    <div className="text-sm text-gray-300">Efficiency</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Session Details */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-300">
                <div>Session ID: {report.sessionId}</div>
                <div>Started: {formatTime(report.startTime)}</div>
                <div>Ended: {formatTime(report.endTime)}</div>
                <div>Expected Duration: {formatDuration(report.totalExpectedTime)}</div>
                <div>Actual Duration: {formatDuration(report.totalActualTime)}</div>
              </CardContent>
            </Card>

            {/* Round Breakdown */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Round Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.roundStats.map((round) => (
                  <div key={round.round} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-white">Round {round.round}</h4>
                      <div className="text-sm text-gray-300">
                        Total: {formatDuration(round.totalTime)}
                      </div>
                    </div>
                    
                    {renderTimelineBar(round)}
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-gray-300">Run: {formatDuration(round.runTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-gray-300">Pause: {formatDuration(round.pauseTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        <span className="text-gray-300">Between: {formatDuration(round.betweenTime)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Anomalies */}
            {report.anomalies.length > 0 && (
              <Card className="bg-gray-800 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    Session Anomalies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {report.anomalies.map((anomaly, index) => (
                      <div key={index} className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{anomaly}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Validation */}
            <Card className="bg-gray-800 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Session Validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>All rounds completed:</span>
                    <span className={report.roundStats.length === report.roundStats.filter(r => r.runTime > 0).length ? 'text-green-400' : 'text-red-400'}>
                      {report.roundStats.filter(r => r.runTime > 0).length} / {report.roundStats.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time variance:</span>
                    <span className={Math.abs(report.totalActualTime - report.totalExpectedTime) < 60000 ? 'text-green-400' : 'text-yellow-400'}>
                      {Math.round(Math.abs(report.totalActualTime - report.totalExpectedTime) / 1000)}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Session quality:</span>
                    <span className={report.anomalies.length === 0 ? 'text-green-400' : 'text-yellow-400'}>
                      {report.anomalies.length === 0 ? 'Excellent' : `${report.anomalies.length} issue(s)`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionReportComponent;
